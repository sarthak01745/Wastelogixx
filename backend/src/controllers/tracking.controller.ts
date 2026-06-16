import type { Request, Response } from "express";
import { LogSource } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/api-error";
import { HardwareService } from "../services/hardware.service";
import { TrackingService } from "../services/tracking.service";

export class TrackingController {
  static async ingest(req: Request, res: Response) {
    const result = await TrackingService.ingest(req.body, {
      driverId: req.user!.id,
      source: LogSource.DRIVER_APP,
    });

    res.status(201).json(result);
  }

  static async ingestFromIot(req: Request, res: Response) {
    const { deviceKey, vehicleId, tripId, lat, lng, latitude, longitude, timestamp, speedKph, speed, heading } = req.body as {
      deviceKey?: string;
      vehicleId?: string;
      tripId?: string;
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
      timestamp?: string;
      speedKph?: number;
      speed?: number;
      heading?: number;
    };

    if (!tripId) {
      const result = await HardwareService.recordLocation(req.body);
      res.status(201).json(result);
      return;
    }

    const resolvedDeviceKey = deviceKey ?? vehicleId;

    if (!resolvedDeviceKey) {
      throw new ApiError(400, "deviceKey is required");
    }

    const truck = await prisma.truck.findUnique({
      where: {
        deviceKey: resolvedDeviceKey,
      },
    });

    if (!truck) {
      throw new ApiError(404, "Truck device was not found");
    }

    const task = await prisma.task.findUnique({
      where: {
        id: tripId,
      },
    });

    if (!task || task.truckId !== truck.id) {
      throw new ApiError(404, "Trip is not linked to this truck");
    }

    const result = await TrackingService.ingest(
      { tripId, lat: lat ?? latitude, lng: lng ?? longitude, timestamp, speedKph: speedKph ?? speed, heading },
      {
        driverId: task.driverId,
        truckId: truck.id,
        source: LogSource.IOT_DEVICE,
      },
    );

    res.status(201).json(result);
  }

  static async bulkSync(req: Request, res: Response) {
    const result = await TrackingService.bulkSync(req.user!.id, req.body);
    res.status(200).json(result);
  }

  static async justifyStop(req: Request, res: Response) {
    const result = await TrackingService.submitStopJustification(
      req.user!.id,
      String(req.params.tripId),
      req.body.reason,
      req.file,
    );

    res.status(201).json(result);
  }

  static async tripLogs(req: Request, res: Response) {
    const result = await TrackingService.getTripLogs(String(req.params.tripId), req.user!);
    res.status(200).json(result);
  }
}
