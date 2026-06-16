import { Router } from "express";
import { HardwareController } from "../controllers/hardware.controller";
import { requireIotSecret } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const hardwareRouter = Router();

hardwareRouter.get("/ping", requireIotSecret, asyncHandler(HardwareController.ping));
hardwareRouter.post("/location", requireIotSecret, asyncHandler(HardwareController.location));
hardwareRouter.post("/status", requireIotSecret, asyncHandler(HardwareController.status));
