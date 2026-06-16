import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/async-handler";

export const invoiceRouter = Router();

invoiceRouter.use(requireAuth);
invoiceRouter.get("/", asyncHandler(InvoiceController.list));
invoiceRouter.post("/:tripId/generate", asyncHandler(InvoiceController.generate));
