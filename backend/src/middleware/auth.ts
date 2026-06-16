import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

type JwtPayload = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const parseBearer = (header?: string) => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = parseBearer(req.headers.authorization);

  if (!token) {
    return next(new ApiError(401, "Authentication token is required"));
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return next();
  } catch {
    return next(new ApiError(401, "Authentication token is invalid"));
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication token is required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have access to this resource"));
    }

    return next();
  };

export const requireIotSecret = (req: Request, _res: Response, next: NextFunction) => {
  if (req.headers["x-iot-secret"] !== env.IOT_SHARED_SECRET) {
    return next(new ApiError(401, "IoT secret is invalid"));
  }

  return next();
};
