import type { Request, Response } from "express";
import { InvoiceService } from "../services/invoice.service";

export class InvoiceController {
  static async list(req: Request, res: Response) {
    const result = await InvoiceService.listForUser(req.user!);
    res.status(200).json(result);
  }

  static async generate(req: Request, res: Response) {
    const result = await InvoiceService.generate(String(req.params.tripId), req.user!);
    res.status(201).json(result);
  }
}
