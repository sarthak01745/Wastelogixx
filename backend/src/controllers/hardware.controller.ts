import type { Request, Response } from "express";
import { HardwareService } from "../services/hardware.service";

export class HardwareController {
  static async ping(_req: Request, res: Response) {
    res.status(200).json({
      ok: true,
      mode: "hardware-ping",
      timestamp: new Date().toISOString(),
    });
  }

  static async location(req: Request, res: Response) {
    const result = await HardwareService.recordLocation(req.body);
    res.status(201).json(result);
  }

  static async status(req: Request, res: Response) {
    const result = await HardwareService.recordStatus(req.body);
    res.status(200).json(result);
  }
}
