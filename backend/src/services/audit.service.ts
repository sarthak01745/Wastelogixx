import { prisma } from "../lib/prisma";
import { chainHash } from "../utils/hash";

type AuditInput = {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  payload?: unknown;
};

export class AuditService {
  static async record(input: AuditInput) {
    const previous = await prisma.auditLog.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });

    const hash = chainHash(previous?.hash, {
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload ?? null,
    });

    return prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? undefined,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        payload: input.payload as never,
        hash,
        previousHash: previous?.hash,
      },
    });
  }
}
