import { Router } from "express";
import { AlertController } from "../controllers/alert.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const alertRouter = Router();

alertRouter.post("/notify-driver", requireAuth, asyncHandler(AlertController.notifyDriver));
