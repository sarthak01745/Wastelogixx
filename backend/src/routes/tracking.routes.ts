import { Router } from "express";
import { TrackingController } from "../controllers/tracking.controller";
import { requireAuth, requireIotSecret, requireRole } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";
import { asyncHandler } from "../utils/async-handler";

export const trackingRouter = Router();

trackingRouter.post("/iot", requireIotSecret, asyncHandler(TrackingController.ingestFromIot));
trackingRouter.use(requireAuth);
trackingRouter.post("/ingest", requireRole("DRIVER"), asyncHandler(TrackingController.ingest));
trackingRouter.post("/sync", requireRole("DRIVER"), asyncHandler(TrackingController.bulkSync));
trackingRouter.post(
  "/tasks/:tripId/justify",
  requireRole("DRIVER"),
  imageUpload.single("image"),
  asyncHandler(TrackingController.justifyStop),
);
trackingRouter.get("/tasks/:tripId/logs", asyncHandler(TrackingController.tripLogs));
