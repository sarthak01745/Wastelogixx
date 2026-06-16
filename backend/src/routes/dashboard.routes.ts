import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/admin/resources", requireRole("ADMIN"), asyncHandler(DashboardController.resources));
dashboardRouter.get("/admin", requireRole("ADMIN"), asyncHandler(DashboardController.admin));
dashboardRouter.get("/driver", requireRole("DRIVER"), asyncHandler(DashboardController.driver));
