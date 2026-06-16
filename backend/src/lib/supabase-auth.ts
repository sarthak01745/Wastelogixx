import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

type AuthUserRole = "ADMIN" | "DRIVER";

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    role?: AuthUserRole;
  };
};

type ListUsersResponse = {
  users: SupabaseAuthUser[];
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  user: SupabaseAuthUser;
};

const parseResponse = async <T>(response: Response) => {
  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : null;
  const errorData = data as {
    msg?: string;
    error_description?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    const message =
      errorData?.msg || errorData?.error_description || errorData?.error || "Supabase request failed";
    throw new ApiError(response.status, message);
  }

  return data as T;
};

const request = async <T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT";
    body?: Record<string, unknown>;
    serviceRole?: boolean;
  } = {},
) => {
  const apiKey = options.serviceRole ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_PUBLISHABLE_KEY;

  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return parseResponse<T>(response);
};

export const listAuthUsers = async () => {
  const response = await request<ListUsersResponse>("/auth/v1/admin/users?page=1&per_page=200", {
    serviceRole: true,
  });

  return response.users;
};

export const findAuthUserByEmail = async (email: string) => {
  const users = await listAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
};

export const ensureAuthUser = async ({
  email,
  password,
  name,
  role,
}: {
  email: string;
  password: string;
  name: string;
  role: AuthUserRole;
}) => {
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    return request<SupabaseAuthUser>(`/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      serviceRole: true,
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role,
        },
      },
    });
  }

  return request<SupabaseAuthUser>("/auth/v1/admin/users", {
    method: "POST",
    serviceRole: true,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      },
    },
  });
};

export const signInWithSupabase = async (email: string, password: string) => {
  return request<TokenResponse>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: {
      email,
      password,
    },
  });
};
