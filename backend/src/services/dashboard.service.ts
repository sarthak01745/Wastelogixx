import { TaskStatus } from "@prisma/client";
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { prisma } from "../lib/prisma";
import type { AdminMetricCard, AlertView, FleetTruckView } from "../models/dashboard";
import { ApiError } from "../utils/api-error";

const buildTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return `${current} new`;
  }

  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta > 0 ? "+" : ""}${delta}% vs prior window`;
};

export class DashboardService {
  static async getAdminResources() {
    const [drivers, trucks] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: "DRIVER",
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.truck.findMany({
        select: {
          id: true,
          truckNumber: true,
          model: true,
          status: true,
          homeBase: true,
          capacityKg: true,
          driverId: true,
        },
        orderBy: {
          truckNumber: "asc",
        },
      }),
    ]);

    return { drivers, trucks };
  }

  static async getAdminOverview() {
    const now = new Date();
    const previousWindowStart = subDays(now, 14);
    const currentWindowStart = subDays(now, 7);

    const [activeTrips, totalTrips, unresolvedAnomalies, previousAnomalies, driverScores, alerts, trucks, tasks] =
      await Promise.all([
        prisma.task.count({
          where: {
            status: TaskStatus.IN_PROGRESS,
          },
        }),
        prisma.task.count(),
        prisma.anomaly.count({
          where: {
            resolved: false,
            timestamp: {
              gte: currentWindowStart,
            },
          },
        }),
        prisma.anomaly.count({
          where: {
            resolved: false,
            timestamp: {
              gte: previousWindowStart,
              lt: currentWindowStart,
            },
          },
        }),
        prisma.driverScore.findMany({
          include: {
            driver: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            score: "desc",
          },
        }),
        prisma.alert.findMany({
          orderBy: {
            createdAt: "desc",
          },
          include: {
            driver: {
              select: {
                name: true,
              },
            },
          },
          take: 12,
        }),
        prisma.truck.findMany({
          include: {
            driver: {
              select: {
                name: true,
              },
            },
            tasks: {
              where: {
                status: {
                  in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED],
                },
              },
              orderBy: {
                scheduledTime: "asc",
              },
              take: 1,
            },
          },
        }),
        prisma.task.findMany({
          where: {
            scheduledTime: {
              gte: currentWindowStart,
            },
          },
          include: {
            anomalies: true,
          },
        }),
      ]);

    const averageScore =
      driverScores.length > 0
        ? Math.round(driverScores.reduce((sum, item) => sum + item.score, 0) / driverScores.length)
        : 0;
    const activeRouteTasks = tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS);
    const plannedDistanceKm = Math.round(tasks.reduce((sum, task) => sum + Number(task.expectedDistanceKm ?? 0), 0));
    const activeLoadKg = activeRouteTasks.reduce((sum, task) => sum + (task.loadWeightKg ?? 0), 0);

    const metricCards: AdminMetricCard[] = [
      {
        label: "Active trips",
        value: activeTrips,
        trend: `${activeTrips}/${Math.max(totalTrips, 1)} trips live`,
      },
      {
        label: "Planned km",
        value: plannedDistanceKm,
        trend: "Distance across the current route slate",
      },
      {
        label: "Active load kg",
        value: activeLoadKg,
        trend: "Payload currently in transit",
      },
      {
        label: "Open anomalies",
        value: unresolvedAnomalies,
        trend: buildTrend(unresolvedAnomalies, previousAnomalies),
      },
      {
        label: "Driver trust",
        value: averageScore,
        trend: "Average live trust score",
      },
    ];

    const fleet: FleetTruckView[] = trucks.map((truck) => {
      const activeTask = truck.tasks[0];

      return {
        truckId: truck.id,
        truckNumber: truck.truckNumber,
        status: truck.status,
        model: truck.model ?? null,
        homeBase: truck.homeBase ?? null,
        capacityKg: truck.capacityKg ?? null,
        driverName: truck.driver?.name ?? null,
        tripId: activeTask?.id ?? null,
        routeStart: activeTask?.routeStart ?? null,
        routeEnd: activeTask?.routeEnd ?? null,
        loadType: activeTask?.loadType ?? null,
        loadWeightKg: activeTask?.loadWeightKg ?? null,
        expectedDistanceKm: activeTask?.expectedDistanceKm ?? null,
        currentLat: truck.currentLat,
        currentLng: truck.currentLng,
        riskLevel: activeTask?.riskLevel ?? null,
        taskStatus: activeTask?.status ?? null,
      };
    });

    const anomalyByType = tasks
      .flatMap((task) => task.anomalies)
      .reduce<Record<string, number>>((accumulator, anomaly) => {
        accumulator[anomaly.type] = (accumulator[anomaly.type] ?? 0) + 1;
        return accumulator;
      }, {});

    const analyticsSeries = Array.from({ length: 7 }).map((_, index) => {
      const date = subDays(now, 6 - index);
      const dayLabel = format(date, "EEE");
      const dayTasks = tasks.filter((task) => format(task.scheduledTime, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
      const anomalyCount = dayTasks.reduce((sum, task) => sum + task.anomalies.length, 0);

      return {
        label: dayLabel,
        trips: dayTasks.length,
        anomalies: anomalyCount,
        avgCompliance:
          dayTasks.length > 0
            ? Math.round(dayTasks.reduce((sum, task) => sum + task.complianceScore, 0) / dayTasks.length)
            : 0,
      };
    });

    const alertFeed: AlertView[] = alerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      createdAt: alert.createdAt,
      tripId: alert.tripId ?? null,
      driverName: alert.driver?.name ?? null,
    }));

    return {
      metricCards,
      fleet,
      driverScores: driverScores.map((entry) => ({
        id: entry.id,
        driverId: entry.driverId,
        name: entry.driver.name,
        email: entry.driver.email,
        score: entry.score,
        metrics: entry.metrics,
        updatedAt: entry.updatedAt,
      })),
      alerts: alertFeed,
      analytics: {
        anomalyByType,
        series: analyticsSeries,
      },
    };
  }

  static async getDriverOverview(driverId: string) {
    const [tasks, score] = await Promise.all([
      prisma.task.findMany({
        where: {
          driverId,
        },
        orderBy: {
          scheduledTime: "asc",
        },
        include: {
          truck: true,
          invoice: true,
          locationLogs: {
            orderBy: {
              timestamp: "asc",
            },
            take: 100,
          },
          stopJustifications: {
            orderBy: {
              timestamp: "desc",
            },
            take: 5,
          },
        },
      }),
      prisma.driverScore.findUnique({
        where: {
          driverId,
        },
      }),
    ]);

    if (!tasks) {
      throw new ApiError(404, "Driver data was not found");
    }

    const currentTrip =
      tasks.find((task) => task.status === TaskStatus.IN_PROGRESS) ??
      tasks.find((task) => task.status === TaskStatus.ASSIGNED) ??
      null;

    const completedTasks = tasks.filter((task) => task.status === TaskStatus.COMPLETED || task.status === TaskStatus.DELAYED);
    const totalPayments = completedTasks.reduce(
      (sum, task) => sum + Number(task.paymentAmount),
      0,
    );
    const routeKm = tasks.reduce((sum, task) => sum + Number(task.expectedDistanceKm ?? 0), 0);
    const totalLoadKg = tasks.reduce((sum, task) => sum + (task.loadWeightKg ?? 0), 0);

    return {
      metrics: {
        totalTrips: tasks.length,
        completedTrips: completedTasks.length,
        pendingTrips: tasks.filter((task) => task.status === TaskStatus.ASSIGNED).length,
        totalPayments,
        routeKm,
        totalLoadKg,
      },
      score,
      currentTrip,
      upcomingTrips: tasks.filter((task) => task.status === TaskStatus.ASSIGNED).slice(0, 4),
      recentInvoices: completedTasks.filter((task) => task.invoice).slice(0, 5),
      alerts: [],
    };
  }

  static getReportRange(period: "WEEKLY" | "MONTHLY") {
    const now = new Date();

    if (period === "MONTHLY") {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }

    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }
}
