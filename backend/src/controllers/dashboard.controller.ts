import type { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";

export class DashboardController {
  static async resources(req: Request, res: Response) {
    const result = await DashboardService.getAdminResources();
    res.status(200).json(result);
  }

  static async admin(req: Request, res: Response) {
    const result = await DashboardService.getAdminOverview();
    res.status(200).json(result);
  }

  static async driver(req: Request, res: Response) {
    const result = await DashboardService.getDriverOverview(req.user!.id);
    res.status(200).json(result);
  }
}
