import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
