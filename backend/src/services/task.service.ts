import { Prisma, TaskStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/api-error";
import { AuditService } from "./audit.service";
import { DriverScoreService } from "./driver-score.service";
import { RoutePlannerService } from "./route-planner.service";

const createTaskSchema = z.object({
  driverId: z.string().min(1),
  truckId: z.string().min(1),
  routeStart: z.string().min(2),
  routeEnd: z.string().min(2),
  routeStartCity: z.string().min(2).optional(),
  routeStartArea: z.string().min(2).optional(),
  routeEndCity: z.string().min(2).optional(),
  routeEndArea: z.string().min(2).optional(),
  expectedPath: z.any(),
  routeCheckpoints: z.any().optional(),
  scheduledTime: z.coerce.date(),
  deadline: z.coerce.date(),
  paymentAmount: z.coerce.number().positive(),
  estimatedDuration: z.coerce.number().int().positive().optional(),
  loadType: z.string().min(2).optional(),
  loadWeightKg: z.coerce.number().int().positive().optional(),
  loadUnits: z.coerce.number().int().positive().optional(),
  manifestCode: z.string().min(2).optional(),
  expectedDistanceKm: z.coerce.number().positive().optional(),
});

const planRouteSchema = z.object({
  originQuery: z.string().min(2),
  destinationQuery: z.string().min(2),
});

const getTaskWithRelations = (taskId: string) =>
  prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      truck: true,
      anomalies: {
        orderBy: {
          timestamp: "desc",
        },
        take: 20,
      },
      stopJustifications: {
        orderBy: {
          timestamp: "desc",
        },
        take: 10,
      },
      locationLogs: {
        orderBy: {
          timestamp: "asc",
        },
      },
      invoice: true,
    },
  });

export class TaskService {
  static async planRoute(payload: unknown) {
    const input = planRouteSchema.parse(payload);
    return RoutePlannerService.planRoute(input);
  }

  static async create(adminId: string, payload: unknown) {
    const input = createTaskSchema.parse(payload);

    const [driver, truck] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: input.driverId,
          role: UserRole.DRIVER,
        },
      }),
      prisma.truck.findUnique({
        where: {
          id: input.truckId,
        },
      }),
    ]);

    if (!driver) {
      throw new ApiError(404, "Driver was not found");
    }

    if (!truck) {
      throw new ApiError(404, "Truck was not found");
    }

    const task = await prisma.task.create({
      data: {
        driverId: input.driverId,
        truckId: input.truckId,
        assignedBy: adminId,
        routeStart: input.routeStart,
        routeEnd: input.routeEnd,
        routeStartCity: input.routeStartCity,
        routeStartArea: input.routeStartArea,
        routeEndCity: input.routeEndCity,
        routeEndArea: input.routeEndArea,
        expectedPath: input.expectedPath as Prisma.InputJsonValue,
        routeCheckpoints: input.routeCheckpoints as Prisma.InputJsonValue | undefined,
        scheduledTime: input.scheduledTime,
        deadline: input.deadline,
        paymentAmount: new Prisma.Decimal(input.paymentAmount),
        estimatedDuration: input.estimatedDuration,
        loadType: input.loadType,
        loadWeightKg: input.loadWeightKg,
        loadUnits: input.loadUnits,
        manifestCode: input.manifestCode,
        expectedDistanceKm: input.expectedDistanceKm,
      },
      include: {
        driver: {
          select: {
            name: true,
          },
        },
        truck: {
          select: {
            truckNumber: true,
          },
        },
      },
    });

    await prisma.truck.update({
      where: {
        id: input.truckId,
      },
      data: {
        driverId: input.driverId,
      },
    });

    await AuditService.record({
      actorId: adminId,
      entityType: "Task",
      entityId: task.id,
      action: "CREATED",
      payload: {
        driverId: input.driverId,
        truckId: input.truckId,
        routeStart: input.routeStart,
        routeEnd: input.routeEnd,
        routeStartCity: input.routeStartCity,
        routeStartArea: input.routeStartArea,
        routeEndCity: input.routeEndCity,
        routeEndArea: input.routeEndArea,
        loadType: input.loadType,
        loadWeightKg: input.loadWeightKg,
        manifestCode: input.manifestCode,
      },
    });

    return task;
  }

  static async listForAdmin() {
    return prisma.task.findMany({
      orderBy: {
        scheduledTime: "desc",
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
          },
        },
        truck: {
          select: {
            id: true,
            truckNumber: true,
            status: true,
            model: true,
            capacityKg: true,
            homeBase: true,
          },
        },
        anomalies: {
          select: {
            id: true,
            type: true,
            severity: true,
            resolved: true,
          },
        },
        invoice: true,
      },
    });
  }

  static async listForDriver(driverId: string) {
    return prisma.task.findMany({
      where: {
        driverId,
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          scheduledTime: "asc",
        },
      ],
      include: {
        truck: true,
        invoice: true,
        locationLogs: {
          orderBy: {
            timestamp: "asc",
          },
          take: 20,
        },
      },
    });
  }

  static async getById(taskId: string, requester: Express.UserPayload) {
    const task = await getTaskWithRelations(taskId);

    if (!task) {
      throw new ApiError(404, "Task was not found");
    }

    if (requester.role === UserRole.DRIVER && task.driverId !== requester.id) {
      throw new ApiError(403, "You do not have access to this task");
    }

    return task;
  }

  static async start(taskId: string, requester: Express.UserPayload) {
    const task = await this.getById(taskId, requester);

    if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.DELAYED) {
      throw new ApiError(409, "This task cannot be started");
    }

    const updated = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: TaskStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        truck: true,
      },
    });

    await prisma.truck.update({
      where: {
        id: updated.truckId,
      },
      data: {
        status: "ON_ROUTE",
      },
    });

    await AuditService.record({
      actorId: requester.id,
      entityType: "Task",
      entityId: taskId,
      action: "STARTED",
    });

    return updated;
  }

  static async complete(taskId: string, requester: Express.UserPayload) {
    const task = await this.getById(taskId, requester);

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new ApiError(409, "This task is not currently in progress");
    }

    const completedAt = new Date();
    const delayed = completedAt.getTime() > task.deadline.getTime();

    const updated = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: delayed ? TaskStatus.DELAYED : TaskStatus.COMPLETED,
        completedAt,
      },
    });

    await prisma.truck.update({
      where: {
        id: task.truckId,
      },
      data: {
        status: "AVAILABLE",
      },
    });

    await DriverScoreService.recompute(task.driverId);
    await AuditService.record({
      actorId: requester.id,
      entityType: "Task",
      entityId: taskId,
      action: delayed ? "COMPLETED_LATE" : "COMPLETED",
    });

    return updated;
  }

  static async replay(taskId: string, requester: Express.UserPayload) {
    const task = await this.getById(taskId, requester);

    return {
      task: {
        id: task.id,
        routeStart: task.routeStart,
        routeEnd: task.routeEnd,
        routeStartCity: task.routeStartCity,
        routeStartArea: task.routeStartArea,
        routeEndCity: task.routeEndCity,
        routeEndArea: task.routeEndArea,
        expectedPath: task.expectedPath,
        routeCheckpoints: task.routeCheckpoints,
        loadType: task.loadType,
        loadWeightKg: task.loadWeightKg,
        loadUnits: task.loadUnits,
        manifestCode: task.manifestCode,
        expectedDistanceKm: task.expectedDistanceKm,
        actualDistanceKm: task.actualDistanceKm,
        estimatedDuration: task.estimatedDuration,
        paymentAmount: task.paymentAmount,
        complianceScore: task.complianceScore,
        status: task.status,
        riskLevel: task.riskLevel,
        riskScore: task.riskScore,
        driver: task.driver,
        truck: task.truck,
      },
      timeline: task.locationLogs.map((log) => ({
        id: log.id,
        lat: log.lat,
        lng: log.lng,
        cityName: log.cityName,
        areaName: log.areaName,
        odometerKm: log.odometerKm,
        timestamp: log.timestamp,
        speedKph: log.speedKph,
        source: log.source,
      })),
      anomalies: task.anomalies,
      stops: task.stopJustifications,
    };
  }
}
