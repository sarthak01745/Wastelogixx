import type { Request, Response } from "express";
import { ReportRange } from "@prisma/client";
import { ReportService } from "../services/report.service";

export class ReportController {
  static async generate(req: Request, res: Response) {
    const period = String(req.params.period).toUpperCase() as ReportRange;
    const result = await ReportService.generate(period, req.user!.id);
    res.status(201).json(result);
  }
}
