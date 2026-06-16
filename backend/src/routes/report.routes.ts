import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const reportRouter = Router();

reportRouter.use(requireAuth, requireRole("ADMIN"));
reportRouter.post("/:period", asyncHandler(ReportController.generate));
