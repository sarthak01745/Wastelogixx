import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/api-error";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, "Route not found"));
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.flatten(),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      message: "Database request failed",
      details: error.message,
    });
  }

  return res.status(500).json({
    message: "Something went wrong",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
};
