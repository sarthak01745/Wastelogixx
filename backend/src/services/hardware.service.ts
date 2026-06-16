import { LogSource, TaskStatus, TruckStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { z } from "zod";
import { emitToAdmins } from "../lib/socket";
import { prisma } from "../lib/prisma";
import { supabaseRest } from "../lib/supabase-rest";
import { ApiError } from "../utils/api-error";
import { chainHash } from "../utils/hash";
import { TrackingService } from "./tracking.service";

const coordinateSchema = z.object({
  deviceKey: z.string().min(2).optional(),
  vehicleId: z.string().min(2).optional(),
  tripId: z.string().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  timestamp: z.coerce.date().optional(),
  speedKph: z.coerce.number().min(0).max(400).optional(),
  speed: z.coerce.number().min(0).max(400).optional(),
  heading: z.coerce.number().min(0).max(360).optional(),
  odometerKm: z.coerce.number().min(0).optional(),
  satellites: z.coerce.number().int().min(0).optional(),
  rssi: z.coerce.number().optional(),
  ipAddress: z.string().optional(),
  firmwareVersion: z.string().optional(),
});

const statusSchema = z.object({
  deviceKey: z.string().min(2).optional(),
  vehicleId: z.string().min(2).optional(),
  gpsFix: z.coerce.boolean().optional(),
  satellites: z.coerce.number().int().min(0).optional(),
  wifiConnected: z.coerce.boolean().optional(),
  rssi: z.coerce.number().optional(),
  ipAddress: z.string().optional(),
  firmwareVersion: z.string().optional(),
  note: z.string().optional(),
});

type CoordinateInput = z.infer<typeof coordinateSchema>;
type StatusInput = z.infer<typeof statusSchema>;

type RestTruckRow = {
  id: string;
  truck_number: string;
  driver_id: string | null;
  status: TruckStatus;
  current_lat: number | null;
  current_lng: number | null;
};

type RestTaskRow = {
  id: string;
  driver_id: string;
  truck_id: string;
  status: TaskStatus;
  actual_distance_km: number | null;
};

type RestLogRow = {
  id: string;
  hash: string | null;
};

const createRestId = (prefix: string) => `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 24)}`;

const isDatabaseConnectivityError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";

  return (
    code === "P1001" ||
    code === "P2024" ||
    message.includes("can't reach database") ||
    message.includes("can't reach database server") ||
    message.includes("schema engine error") ||
    message.includes("connection")
  );
};

const resolveDeviceKey = (payload: { deviceKey?: string; vehicleId?: string }) => {
  const deviceKey = payload.deviceKey ?? payload.vehicleId;

  if (!deviceKey) {
    throw new ApiError(400, "deviceKey is required");
  }

  return deviceKey;
};

export class HardwareService {
  private static async getTruckForDevice(deviceKey: string) {
    const truck = await prisma.truck.findUnique({
      where: {
        deviceKey,
      },
      include: {
        driver: true,
      },
    });

    if (!truck) {
      throw new ApiError(404, "Hardware device is not registered to a truck");
    }

    if (!truck.driverId) {
      throw new ApiError(409, "Hardware truck does not have a driver assignment");
    }

    return truck;
  }

  private static async getActiveTrip(truckId: string, explicitTripId?: string) {
    const task = explicitTripId
      ? await prisma.task.findFirst({
          where: {
            id: explicitTripId,
            truckId,
          },
        })
      : await prisma.task.findFirst({
          where: {
            truckId,
            status: {
              in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED],
            },
          },
          orderBy: {
            scheduledTime: "asc",
          },
        });

    if (!task) {
      throw new ApiError(409, "No active trip is linked to this hardware truck");
    }

    return task;
  }

  static async recordLocation(payload: unknown) {
    const input = coordinateSchema.parse(payload);
    const deviceKey = resolveDeviceKey(input);
    const lat = input.lat ?? input.latitude;
    const lng = input.lng ?? input.longitude;

    if (lat === undefined || lng === undefined) {
      throw new ApiError(400, "lat/lng are required");
    }

    try {
      const truck = await this.getTruckForDevice(deviceKey);
      const task = await this.getActiveTrip(truck.id, input.tripId);

      const result = await TrackingService.ingest(
        {
          tripId: task.id,
          lat,
          lng,
          timestamp: input.timestamp,
          speedKph: input.speedKph ?? input.speed,
          heading: input.heading,
          odometerKm: input.odometerKm,
        },
        {
          driverId: task.driverId,
          truckId: truck.id,
          source: LogSource.IOT_DEVICE,
        },
      );

      emitToAdmins("hardware:location", {
        deviceKey,
        truckId: truck.id,
        truckNumber: truck.truckNumber,
        tripId: task.id,
        lat,
        lng,
        satellites: input.satellites ?? null,
        rssi: input.rssi ?? null,
        ipAddress: input.ipAddress ?? null,
        firmwareVersion: input.firmwareVersion ?? null,
        timestamp: input.timestamp ?? new Date(),
      });

      return {
        ok: true,
        mode: "location",
        deviceKey,
        truckNumber: truck.truckNumber,
        tripId: task.id,
        locationLogId: result.locationLog.id,
        requiresStopValidation: result.requiresStopValidation,
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
      };
    } catch (error) {
      if (!isDatabaseConnectivityError(error)) {
        throw error;
      }

      return this.recordLocationViaRest(input, deviceKey, lat, lng);
    }
  }

  static async recordStatus(payload: unknown) {
    const input = statusSchema.parse(payload);
    const deviceKey = resolveDeviceKey(input);

    try {
      const truck = await this.getTruckForDevice(deviceKey);
      const status = input.gpsFix || (truck.currentLat !== null && truck.currentLng !== null)
        ? TruckStatus.ON_ROUTE
        : TruckStatus.OFFLINE;

      const updated = await prisma.truck.update({
        where: {
          id: truck.id,
        },
        data: {
          status,
          lastPingAt: new Date(),
        },
        select: {
          id: true,
          truckNumber: true,
          status: true,
          currentLat: true,
          currentLng: true,
          lastPingAt: true,
        },
      });

      emitToAdmins("hardware:status", {
        deviceKey,
        truckId: updated.id,
        truckNumber: updated.truckNumber,
        status: updated.status,
        gpsFix: input.gpsFix ?? false,
        satellites: input.satellites ?? null,
        wifiConnected: input.wifiConnected ?? null,
        rssi: input.rssi ?? null,
        ipAddress: input.ipAddress ?? null,
        firmwareVersion: input.firmwareVersion ?? null,
        note: input.note ?? null,
        timestamp: updated.lastPingAt,
      });

      return {
        ok: true,
        mode: "status",
        deviceKey,
        truckNumber: updated.truckNumber,
        status: updated.status,
        lastPingAt: updated.lastPingAt,
      };
    } catch (error) {
      if (!isDatabaseConnectivityError(error)) {
        throw error;
      }

      return this.recordStatusViaRest(input, deviceKey);
    }
  }

  private static async getRestTruck(deviceKey: string) {
    const rows = await supabaseRest<RestTruckRow[]>(
      `Truck?device_key=eq.${encodeURIComponent(deviceKey)}&select=id,truck_number,driver_id,status,current_lat,current_lng&limit=1`,
    );
    const truck = rows[0];

    if (!truck) {
      throw new ApiError(404, "Hardware device is not registered to a truck");
    }

    if (!truck.driver_id) {
      throw new ApiError(409, "Hardware truck does not have a driver assignment");
    }

    return truck;
  }

  private static async getRestActiveTrip(truckId: string, explicitTripId?: string) {
    const path = explicitTripId
      ? `Task?id=eq.${encodeURIComponent(explicitTripId)}&truck_id=eq.${encodeURIComponent(truckId)}&select=id,driver_id,truck_id,status,actual_distance_km&limit=1`
      : `Task?truck_id=eq.${encodeURIComponent(truckId)}&status=in.(ASSIGNED,IN_PROGRESS,DELAYED)&select=id,driver_id,truck_id,status,actual_distance_km&order=scheduled_time.asc&limit=1`;
    const rows = await supabaseRest<RestTaskRow[]>(path);
    const task = rows[0];

    if (!task) {
      throw new ApiError(409, "No active trip is linked to this hardware truck");
    }

    return task;
  }

  private static async recordLocationViaRest(input: CoordinateInput, deviceKey: string, lat: number, lng: number) {
    const truck = await this.getRestTruck(deviceKey);
    const task = await this.getRestActiveTrip(truck.id, input.tripId);
    const timestamp = input.timestamp ?? new Date();
    const now = new Date().toISOString();

    const previousRows = await supabaseRest<RestLogRow[]>(
      `LocationLog?trip_id=eq.${encodeURIComponent(task.id)}&select=id,hash&order=timestamp.desc&limit=1`,
    );
    const previous = previousRows[0];
    const hash = chainHash(previous?.hash ?? undefined, {
      tripId: task.id,
      driverId: task.driver_id,
      truckId: truck.id,
      lat,
      lng,
      timestamp,
      source: LogSource.IOT_DEVICE,
    });
    const logId = createRestId("hardware-log");

    if (task.status === TaskStatus.ASSIGNED) {
      await supabaseRest(`Task?id=eq.${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: {
          status: TaskStatus.IN_PROGRESS,
          started_at: timestamp.toISOString(),
          updatedAt: now,
        },
      });
    }

    await supabaseRest("LocationLog", {
      method: "POST",
      prefer: "return=minimal",
      body: [
        {
          id: logId,
          trip_id: task.id,
          driver_id: task.driver_id,
          truck_id: truck.id,
          lat,
          lng,
          city_name: null,
          area_name: null,
          odometer_km: input.odometerKm ?? task.actual_distance_km ?? 0,
          speed_kph: input.speedKph ?? input.speed ?? null,
          heading: input.heading ?? null,
          timestamp: timestamp.toISOString(),
          source: LogSource.IOT_DEVICE,
          hash,
          previous_hash: previous?.hash ?? null,
          is_offline_capture: false,
          inside_allowed_zone: null,
          inside_restricted: null,
          createdAt: now,
        },
      ],
    });

    await Promise.all([
      supabaseRest(`Truck?id=eq.${encodeURIComponent(truck.id)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: {
          current_lat: lat,
          current_lng: lng,
          last_ping_at: timestamp.toISOString(),
          status: TruckStatus.ON_ROUTE,
          updatedAt: now,
        },
      }),
      supabaseRest(`Task?id=eq.${encodeURIComponent(task.id)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: {
          actual_distance_km: input.odometerKm ?? task.actual_distance_km ?? 0,
          updatedAt: now,
        },
      }),
    ]);

    emitToAdmins("hardware:location", {
      deviceKey,
      truckId: truck.id,
      truckNumber: truck.truck_number,
      tripId: task.id,
      lat,
      lng,
      satellites: input.satellites ?? null,
      rssi: input.rssi ?? null,
      ipAddress: input.ipAddress ?? null,
      firmwareVersion: input.firmwareVersion ?? null,
      timestamp,
      fallback: "supabase-rest",
    });

    return {
      ok: true,
      mode: "location",
      deviceKey,
      truckNumber: truck.truck_number,
      tripId: task.id,
      locationLogId: logId,
      requiresStopValidation: false,
      riskLevel: "LOW",
      riskScore: 0,
    };
  }

  private static async recordStatusViaRest(input: StatusInput, deviceKey: string) {
    const truck = await this.getRestTruck(deviceKey);
    const timestamp = new Date();
    const status = input.gpsFix || (truck.current_lat !== null && truck.current_lng !== null)
      ? TruckStatus.ON_ROUTE
      : TruckStatus.OFFLINE;

    await supabaseRest(`Truck?id=eq.${encodeURIComponent(truck.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: {
        status,
        last_ping_at: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      },
    });

    emitToAdmins("hardware:status", {
      deviceKey,
      truckId: truck.id,
      truckNumber: truck.truck_number,
      status,
      gpsFix: input.gpsFix ?? false,
      satellites: input.satellites ?? null,
      wifiConnected: input.wifiConnected ?? null,
      rssi: input.rssi ?? null,
      ipAddress: input.ipAddress ?? null,
      firmwareVersion: input.firmwareVersion ?? null,
      note: input.note ?? null,
      timestamp,
      fallback: "supabase-rest",
    });

    return {
      ok: true,
      mode: "status",
      deviceKey,
      truckNumber: truck.truck_number,
      status,
      lastPingAt: timestamp,
    };
  }
}
