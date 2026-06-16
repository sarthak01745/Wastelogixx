import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(AuthController.register));
authRouter.post("/login", asyncHandler(AuthController.login));
authRouter.get("/me", requireAuth, asyncHandler(AuthController.me));
