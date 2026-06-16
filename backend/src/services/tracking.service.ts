import { LogSource, RiskLevel, Severity, TaskStatus, UserRole } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { env } from "../config/env";
import { emitToAdmins, emitToDriver } from "../lib/socket";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/api-error";
import { countStopClusters, computeDeviationMeters, isInsidePolygon, metersBetween } from "../utils/geo";
import { chainHash, hashValue } from "../utils/hash";
import { AuditService } from "./audit.service";
import { DriverScoreService } from "./driver-score.service";
import { RoutePlannerService } from "./route-planner.service";

const logInputSchema = z.object({
  tripId: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  cityName: z.string().min(2).optional(),
  areaName: z.string().min(2).optional(),
  odometerKm: z.coerce.number().min(0).optional(),
  timestamp: z.coerce.date().optional(),
  speedKph: z.coerce.number().min(0).max(400).optional(),
  heading: z.coerce.number().min(0).max(360).optional(),
  source: z.nativeEnum(LogSource).default(LogSource.DRIVER_APP),
  isOfflineCapture: z.coerce.boolean().default(false),
});

const bulkSyncSchema = z.object({
  logs: z.array(logInputSchema).min(1).max(env.SYNC_BATCH_LIMIT),
});

type AnomalyDraft = {
  type: "DEVIATION" | "LONG_STOP" | "GPS_SPOOF" | "MULTI_STOP" | "GEOFENCE" | "DUPLICATE_IMAGE";
  severity: Severity;
  message: string;
  metadata?: Record<string, unknown>;
};

const createAnomaly = async (tripId: string, driverId: string, anomaly: AnomalyDraft) => {
  const recent = await prisma.anomaly.findFirst({
    where: {
      tripId,
      type: anomaly.type,
      resolved: false,
      timestamp: {
        gte: new Date(Date.now() - 20 * 60 * 1000),
      },
    },
  });

  if (recent) {
    return recent;
  }

  const created = await prisma.anomaly.create({
    data: {
      tripId,
      driverId,
      type: anomaly.type,
      severity: anomaly.severity,
      message: anomaly.message,
      metadata: anomaly.metadata as never,
    },
  });

  const alert = await prisma.alert.create({
    data: {
      tripId,
      driverId,
      anomalyId: created.id,
      title: "Compliance alert",
      message: anomaly.message,
      severity: anomaly.severity,
    },
  });

  emitToAdmins("alert:new", {
    id: alert.id,
    tripId,
    driverId,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    createdAt: alert.createdAt,
  });

  return created;
};

const computeRiskLevel = (riskScore: number): RiskLevel => {
  if (riskScore >= 65) {
    return RiskLevel.HIGH;
  }

  if (riskScore >= 30) {
    return RiskLevel.MEDIUM;
  }

  return RiskLevel.LOW;
};

export class TrackingService {
  private static async detectAnomalies(
    task: Awaited<ReturnType<typeof prisma.task.findUniqueOrThrow>>,
    logsDescending: Array<{
      id: string;
      lat: number;
      lng: number;
      timestamp: Date;
      speedKph: number | null;
    }>,
    current: { lat: number; lng: number; timestamp: Date },
  ) {
    const anomalies: AnomalyDraft[] = [];
    const previous = logsDescending[0];
    const deviation = computeDeviationMeters(task.expectedPath as never, current.lat, current.lng);

    if (deviation > env.ROUTE_DEVIATION_METERS) {
      anomalies.push({
        type: "DEVIATION",
        severity: deviation > env.ROUTE_DEVIATION_METERS * 2 ? Severity.HIGH : Severity.MEDIUM,
        message: `Vehicle deviated ${Math.round(deviation)}m away from the assigned route.`,
        metadata: {
          deviationMeters: Math.round(deviation),
        },
      });
    }

    if (previous) {
      const distanceMeters = metersBetween(previous, current);
      const hours = Math.max((current.timestamp.getTime() - previous.timestamp.getTime()) / 3600000, 0.001);
      const impliedSpeed = distanceMeters / 1000 / hours;

      if (impliedSpeed > env.GPS_SPOOF_SPEED_KPH) {
        anomalies.push({
          type: "GPS_SPOOF",
          severity: Severity.CRITICAL,
          message: `Detected an unrealistic GPS jump at ${Math.round(impliedSpeed)} km/h.`,
          metadata: {
            impliedSpeed: Math.round(impliedSpeed),
            distanceMeters: Math.round(distanceMeters),
          },
        });
      }
    }

    const longStopWindow = logsDescending
      .filter((log) => log.timestamp.getTime() >= current.timestamp.getTime() - env.LONG_STOP_MINUTES * 60000)
      .map((log) => ({
        lat: log.lat,
        lng: log.lng,
        timestamp: log.timestamp,
      }))
      .concat(current)
      .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

    if (longStopWindow.length >= 3) {
      const anchor = longStopWindow[0];
      const stationary = longStopWindow.every(
        (log) => metersBetween(anchor, log) <= env.STOP_RADIUS_METERS,
      );

      if (stationary) {
        const stoppedMinutes =
          (longStopWindow[longStopWindow.length - 1].timestamp.getTime() - anchor.timestamp.getTime()) / 60000;

        if (stoppedMinutes >= env.LONG_STOP_MINUTES) {
          anomalies.push({
            type: "LONG_STOP",
            severity: Severity.MEDIUM,
            message: `Vehicle has been stationary for ${Math.round(stoppedMinutes)} minutes.`,
            metadata: {
              stoppedMinutes: Math.round(stoppedMinutes),
            },
          });
        }
      }
    }

    const multiStopWindow = logsDescending
      .filter((log) => log.timestamp.getTime() >= current.timestamp.getTime() - 2 * 60 * 60000)
      .map((log) => ({
        lat: log.lat,
        lng: log.lng,
        timestamp: log.timestamp,
      }))
      .concat(current)
      .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

    const stopClusters = countStopClusters(multiStopWindow, env.STOP_RADIUS_METERS, 5);

    if (stopClusters >= env.MULTI_STOP_THRESHOLD) {
      anomalies.push({
        type: "MULTI_STOP",
        severity: Severity.HIGH,
        message: `Vehicle registered ${stopClusters} suspicious stop clusters in the last two hours.`,
        metadata: {
          stopClusters,
        },
      });
    }

    const geofences = await prisma.geofence.findMany({
      where: {
        active: true,
      },
    });

    const allowedZones = geofences.filter((zone) => zone.kind === "ALLOWED");
    const restrictedZones = geofences.filter((zone) => zone.kind === "RESTRICTED");

    const insideRestricted = restrictedZones.some((zone) =>
      isInsidePolygon(zone.geometry as never, current.lat, current.lng),
    );
    const insideAllowed =
      allowedZones.length === 0 ||
      allowedZones.some((zone) => isInsidePolygon(zone.geometry as never, current.lat, current.lng));

    if (insideRestricted || !insideAllowed) {
      anomalies.push({
        type: "GEOFENCE",
        severity: Severity.HIGH,
        message: insideRestricted
          ? "Vehicle entered a restricted geofence."
          : "Vehicle moved outside the allowed operating corridor.",
        metadata: {
          insideRestricted,
          insideAllowed,
        },
      });
    }

    return {
      anomalies,
      insideRestricted,
      insideAllowed,
      deviation,
    };
  }

  static async ingest(
    payload: unknown,
    actor: { driverId: string; source: LogSource; truckId?: string; isOfflineCapture?: boolean },
  ) {
    const input = logInputSchema.parse({
      ...(typeof payload === "object" && payload ? payload : {}),
      source: actor.source,
      isOfflineCapture: actor.isOfflineCapture ?? false,
    });

    const task = await prisma.task.findUnique({
      where: {
        id: input.tripId,
      },
      include: {
        truck: true,
        locationLogs: {
          orderBy: {
            timestamp: "desc",
          },
          take: 50,
        },
      },
    });

    if (!task) {
      throw new ApiError(404, "Trip was not found");
    }

    if (task.driverId !== actor.driverId) {
      throw new ApiError(403, "You do not have access to this trip");
    }

    const timestamp = input.timestamp ?? new Date();
    const resolvedPlace =
      input.cityName && input.areaName
        ? null
        : await RoutePlannerService.resolvePlaceFromCoordinates(input.lat, input.lng).catch(() => null);
    const cityName = input.cityName ?? resolvedPlace?.cityName ?? resolvedPlace?.stateName ?? null;
    const areaName = input.areaName ?? resolvedPlace?.areaName ?? resolvedPlace?.cityName ?? null;

    if (task.status === TaskStatus.ASSIGNED) {
      await prisma.task.update({
        where: {
          id: task.id,
        },
        data: {
          status: TaskStatus.IN_PROGRESS,
          startedAt: task.startedAt ?? timestamp,
        },
      });
    }

    const previousLog = task.locationLogs[0];
    const hash = chainHash(previousLog?.hash, {
      tripId: task.id,
      driverId: task.driverId,
      truckId: task.truckId,
      lat: input.lat,
      lng: input.lng,
      cityName,
      areaName,
      odometerKm: input.odometerKm,
      timestamp,
      source: input.source,
    });

    const analysis = await this.detectAnomalies(task, task.locationLogs, {
      lat: input.lat,
      lng: input.lng,
      timestamp,
    });

    const locationLog = await prisma.locationLog.create({
      data: {
        tripId: task.id,
        driverId: task.driverId,
        truckId: actor.truckId ?? task.truckId,
        lat: input.lat,
        lng: input.lng,
        cityName,
        areaName,
        odometerKm: input.odometerKm,
        speedKph: input.speedKph,
        heading: input.heading,
        timestamp,
        source: input.source,
        hash,
        previousHash: previousLog?.hash,
        isOfflineCapture: input.isOfflineCapture,
        insideAllowedZone: analysis.insideAllowed,
        insideRestricted: analysis.insideRestricted,
      },
    });

    await prisma.truck.update({
      where: {
        id: task.truckId,
      },
      data: {
        currentLat: input.lat,
        currentLng: input.lng,
        lastPingAt: timestamp,
        status: "ON_ROUTE",
      },
    });

    const createdAnomalies = (
      await Promise.all(
        analysis.anomalies.map((anomaly) => createAnomaly(task.id, task.driverId, anomaly)),
      )
    ).filter(Boolean);

    const unresolved = await prisma.anomaly.findMany({
      where: {
        tripId: task.id,
        resolved: false,
      },
      select: {
        severity: true,
      },
    });

    const riskScore = Math.min(
      100,
      unresolved.reduce((sum, anomaly) => {
        if (anomaly.severity === Severity.CRITICAL) {
          return sum + 30;
        }

        if (anomaly.severity === Severity.HIGH) {
          return sum + 20;
        }

        if (anomaly.severity === Severity.MEDIUM) {
          return sum + 12;
        }

        return sum + 6;
      }, Math.round(Math.min(analysis.deviation / 10, 20))),
    );

    const riskLevel = computeRiskLevel(riskScore);
    const complianceScore = Math.max(0, 100 - riskScore);
    const latestTrail = [locationLog].concat(task.locationLogs).sort(
      (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
    );
    const actualDistanceKm = input.odometerKm
      ? input.odometerKm
      : Number(
          (
            latestTrail.reduce((sum, log, index, logs) => {
              if (index === 0) {
                return 0;
              }

              return sum + metersBetween(logs[index - 1], log) / 1000;
            }, 0)
          ).toFixed(1),
        );

    await prisma.task.update({
      where: {
        id: task.id,
      },
      data: {
        riskScore,
        riskLevel,
        complianceScore,
        actualDistanceKm,
      },
    });

    await DriverScoreService.recompute(task.driverId);

    emitToAdmins("tracking:update", {
      tripId: task.id,
      truckId: task.truckId,
      driverId: task.driverId,
      lat: input.lat,
      lng: input.lng,
      cityName,
      areaName,
      timestamp,
      riskLevel,
      anomalies: createdAnomalies.map((anomaly) => ({
        id: anomaly.id,
        type: anomaly.type,
        severity: anomaly.severity,
        message: anomaly.message,
      })),
    });

    const requiresStopValidation = createdAnomalies.some((anomaly) =>
      ["LONG_STOP", "MULTI_STOP", "GEOFENCE"].includes(anomaly.type),
    );

    if (requiresStopValidation) {
      emitToDriver(task.driverId, "driver:stop-validation", {
        tripId: task.id,
        prompt: "Why did you stop?",
      });
    }

    return {
      locationLog,
      anomalies: createdAnomalies,
      requiresStopValidation,
      riskLevel,
      riskScore,
    };
  }

  static async bulkSync(driverId: string, payload: unknown) {
    const input = bulkSyncSchema.parse(payload);
    const processed = [];

    for (const log of input.logs) {
      const result = await this.ingest(log, {
        driverId,
        source: LogSource.BULK_SYNC,
        isOfflineCapture: true,
      });

      processed.push(result.locationLog.id);
    }

    return {
      count: processed.length,
      ids: processed,
    };
  }

  static async submitStopJustification(
    driverId: string,
    tripId: string,
    reason: string,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new ApiError(400, "A live camera capture is required");
    }

    const task = await prisma.task.findUnique({
      where: {
        id: tripId,
      },
      include: {
        driver: true,
      },
    });

    if (!task) {
      throw new ApiError(404, "Trip was not found");
    }

    if (task.driverId !== driverId) {
      throw new ApiError(403, "You do not have access to this trip");
    }

    const extension = file.mimetype.split("/")[1] || "jpg";
    const fileName = `${tripId}-${Date.now()}.${extension}`;
    const uploadsDir = path.resolve(process.cwd(), "uploads", "proofs");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, file.buffer);

    const imageHash = hashValue(file.buffer.toString("base64"));
    const duplicate = await prisma.stopJustification.findFirst({
      where: {
        imageHash,
      },
    });

    const imageUrl = `${env.APP_URL}/uploads/proofs/${fileName}`;

    const justification = await prisma.stopJustification.create({
      data: {
        tripId,
        driverId,
        reason,
        imageUrl,
        imageHash,
        isDuplicate: Boolean(duplicate),
      },
    });

    if (duplicate) {
      await createAnomaly(tripId, driverId, {
        type: "DUPLICATE_IMAGE",
        severity: Severity.HIGH,
        message: "Duplicate stop proof image detected.",
        metadata: {
          previousJustificationId: duplicate.id,
        },
      });
    }

    await AuditService.record({
      actorId: driverId,
      entityType: "StopJustification",
      entityId: justification.id,
      action: "SUBMITTED",
      payload: {
        tripId,
        isDuplicate: justification.isDuplicate,
      },
    });

    return justification;
  }

  static async getTripLogs(tripId: string, requester: Express.UserPayload) {
    const task = await prisma.task.findUnique({
      where: {
        id: tripId,
      },
      include: {
        locationLogs: {
          orderBy: {
            timestamp: "asc",
          },
        },
        anomalies: {
          orderBy: {
            timestamp: "asc",
          },
        },
        stopJustifications: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
    });

    if (!task) {
      throw new ApiError(404, "Trip was not found");
    }

    if (requester.role !== UserRole.ADMIN && task.driverId !== requester.id) {
      throw new ApiError(403, "You do not have access to this trip");
    }

    return task;
  }
}
