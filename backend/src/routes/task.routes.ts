import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const taskRouter = Router();

taskRouter.use(requireAuth);
taskRouter.get("/", asyncHandler(TaskController.list));
taskRouter.post("/plan-route", requireRole("ADMIN"), asyncHandler(TaskController.planRoute));
taskRouter.post("/", requireRole("ADMIN"), asyncHandler(TaskController.create));
taskRouter.post("/:taskId/start", asyncHandler(TaskController.start));
taskRouter.post("/:taskId/complete", asyncHandler(TaskController.complete));
taskRouter.get("/:taskId/replay", asyncHandler(TaskController.replay));
