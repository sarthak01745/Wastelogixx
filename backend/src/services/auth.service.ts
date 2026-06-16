import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { supabaseRest } from "../lib/supabase-rest";
import { ensureAuthUser, signInWithSupabase } from "../lib/supabase-auth";
import { ApiError } from "../utils/api-error";
import { AuditService } from "./audit.service";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const toSafeUser = (user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const signToken = (user: { id: string; name: string; email: string; role: UserRole }) =>
  jwt.sign(toSafeUser(user), env.JWT_SECRET as Secret, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

const createManagedPasswordHash = () => bcrypt.hash(randomUUID(), 12);

type RestUserRow = {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: UserRole;
};

const createRestId = () => `user-${randomUUID().replace(/-/g, "").slice(0, 24)}`;

const isDatabaseConnectivityError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";

  return (
    code === "P1001" ||
    code === "P2024" ||
    message.includes("can't reach database") ||
    message.includes("can't reach database server") ||
    message.includes("schema engine error") ||
    message.includes("connection")
  );
};

const findRestUserByEmail = async (email: string) => {
  const rows = await supabaseRest<RestUserRow[]>(
    `User?email=eq.${encodeURIComponent(email)}&select=id,auth_user_id,name,email,role&limit=1`,
  );

  return rows[0] ?? null;
};

const findRestUserById = async (id: string) => {
  const rows = await supabaseRest<RestUserRow[]>(
    `User?id=eq.${encodeURIComponent(id)}&select=id,auth_user_id,name,email,role&limit=1`,
  );

  return rows[0] ?? null;
};

const ensureRestDriverScore = async (driverId: string) => {
  const existing = await supabaseRest<Array<{ id: string }>>(
    `DriverScore?driver_id=eq.${encodeURIComponent(driverId)}&select=id&limit=1`,
  );

  if (existing[0]) {
    return;
  }

  await supabaseRest("DriverScore", {
    method: "POST",
    prefer: "return=minimal",
    body: [
      {
        id: `score-${randomUUID().replace(/-/g, "").slice(0, 24)}`,
        driver_id: driverId,
        score: 100,
        metrics: {
          onboarding: true,
          source: "supabase-rest-fallback",
        },
        updated_at: new Date().toISOString(),
      },
    ],
  });
};

const upsertRestUser = async ({
  authUserId,
  name,
  email,
  role,
}: {
  authUserId: string;
  name: string;
  email: string;
  role: UserRole;
}) => {
  const now = new Date().toISOString();
  const existing = await findRestUserByEmail(email);

  if (existing) {
    const [updated] = await supabaseRest<RestUserRow[]>(`User?id=eq.${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: {
        auth_user_id: authUserId,
        name,
        role,
        updatedAt: now,
      },
    });

    if (role === UserRole.DRIVER) {
      await ensureRestDriverScore(updated.id);
    }

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    };
  }

  const [created] = await supabaseRest<RestUserRow[]>("User", {
    method: "POST",
    prefer: "return=representation",
    body: [
      {
        id: createRestId(),
        auth_user_id: authUserId,
        name,
        email,
        password: await createManagedPasswordHash(),
        role,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  if (role === UserRole.DRIVER) {
    await ensureRestDriverScore(created.id);
  }

  return {
    id: created.id,
    name: created.name,
    email: created.email,
    role: created.role,
  };
};

export class AuthService {
  static async register(payload: unknown) {
    const input = registerSchema.parse(payload);

    let existing: { id: string } | null = null;

    try {
      existing = await prisma.user.findUnique({
        where: {
          email: input.email,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (!isDatabaseConnectivityError(error)) {
        throw error;
      }

      existing = await findRestUserByEmail(input.email);
    }

    if (existing) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const authUser = await ensureAuthUser({
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
    });

    try {
      const user = await prisma.user.create({
        data: {
          authUserId: authUser.id,
          name: input.name,
          email: input.email,
          password: await createManagedPasswordHash(),
          role: input.role,
          ...(input.role === UserRole.DRIVER
            ? {
                driverScore: {
                  create: {
                    score: 100,
                    metrics: {
                      onboarding: true,
                      source: "signup",
                    },
                  },
                },
              }
            : {}),
        },
      });

      await AuditService.record({
        actorId: user.id,
        entityType: "User",
        entityId: user.id,
        action: "REGISTERED",
        payload: {
          role: user.role,
          authUserId: authUser.id,
        },
      });

      return {
        token: signToken(user),
        user: toSafeUser(user),
      };
    } catch (error) {
      if (!isDatabaseConnectivityError(error)) {
        throw error;
      }

      const user = await upsertRestUser({
        authUserId: authUser.id,
        name: input.name,
        email: input.email,
        role: input.role,
      });

      return {
        token: signToken(user),
        user,
      };
    }
  }

  static async login(payload: unknown) {
    const input = loginSchema.parse(payload);
    const session = await signInWithSupabase(input.email, input.password);

    const role = session.user.user_metadata?.role === "ADMIN" ? UserRole.ADMIN : UserRole.DRIVER;
    const name = session.user.user_metadata?.name ?? input.email.split("@")[0];

    try {
      const user =
        (await prisma.user.findFirst({
          where: {
            OR: [{ authUserId: session.user.id }, { email: input.email }],
          },
        })) ??
        (await prisma.user.create({
          data: {
            authUserId: session.user.id,
            name,
            email: input.email,
            password: await createManagedPasswordHash(),
            role,
          },
        }));

      if (!user.authUserId || user.authUserId !== session.user.id) {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            authUserId: session.user.id,
            name,
            role,
          },
        });
      }

      return {
        token: signToken({
          id: user.id,
          name,
          email: user.email,
          role,
        }),
        user: {
          id: user.id,
          name,
          email: user.email,
          role,
        },
      };
    } catch (error) {
      if (!isDatabaseConnectivityError(error)) {
        throw error;
      }

      const user = await upsertRestUser({
        authUserId: session.user.id,
        name,
        email: input.email,
        role,
      });

      return {
        token: signToken(user),
        user,
      };
    }
  }

  static async getProfile(userId: string) {
    let user: { id: string; name: string; email: string; role: UserRole } | null = null;

    try {
      user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    } catch (error) {
      if (!isDatabaseConnectivityError(error)) {
        throw error;
      }

      const restUser = await findRestUserById(userId);
      user = restUser
        ? {
            id: restUser.id,
            name: restUser.name,
            email: restUser.email,
            role: restUser.role,
          }
        : null;
    }

    if (!user) {
      throw new ApiError(404, "User account was not found");
    }

    return user;
  }
}
