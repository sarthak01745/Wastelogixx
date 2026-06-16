import { Router } from "express";
import { authRouter } from "./auth.routes";
import { dashboardRouter } from "./dashboard.routes";
import { HardwareController } from "../controllers/hardware.controller";
import { hardwareRouter } from "./hardware.routes";
import { invoiceRouter } from "./invoice.routes";
import { reportRouter } from "./report.routes";
import { taskRouter } from "./task.routes";
import { trackingRouter } from "./tracking.routes";
import { requireIotSecret } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

import { alertRouter } from "./alert.routes";

export const apiRouter = Router();

apiRouter.use("/alerts", alertRouter);

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/hardware", hardwareRouter);
apiRouter.use("/tasks", taskRouter);
apiRouter.use("/tracking", trackingRouter);
apiRouter.use("/invoices", invoiceRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.post("/gps-data", requireIotSecret, asyncHandler(HardwareController.location));
apiRouter.post("/hardware-status", requireIotSecret, asyncHandler(HardwareController.status));
