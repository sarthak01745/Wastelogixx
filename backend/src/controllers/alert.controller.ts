import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Severity } from "@prisma/client";

export class AlertController {
  static async notifyDriver(req: Request, res: Response) {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can send driver notifications." });
    }

    const { tripId, driverId, anomalyId, title, message, severity } = req.body;

    if (!driverId || !title || !message) {
      return res.status(400).json({ error: "Missing required fields (driverId, title, message)." });
    }

    const validSeverity = Object.values(Severity).includes(severity) ? severity : "MEDIUM";

    try {
      const alert = await prisma.alert.create({
        data: {
          tripId,
          driverId,
          anomalyId,
          title,
          message,
          severity: validSeverity,
        },
      });

      return res.json({ success: true, alert });
    } catch (error) {
      console.error("Error creating alert:", error);
      return res.status(500).json({ error: "Failed to send notification to driver." });
    }
  }
}
