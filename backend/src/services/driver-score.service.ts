import { TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class DriverScoreService {
  static async recompute(driverId: string) {
    const [tasks, anomalies, justifications] = await Promise.all([
      prisma.task.findMany({
        where: {
          driverId,
        },
        select: {
          status: true,
          complianceScore: true,
          deadline: true,
          completedAt: true,
        },
      }),
      prisma.anomaly.findMany({
        where: {
          driverId,
        },
        select: {
          severity: true,
          type: true,
          resolved: true,
        },
      }),
      prisma.stopJustification.count({
        where: {
          driverId,
        },
      }),
    ]);

    const completedTasks = tasks.filter((task) => task.status === TaskStatus.COMPLETED);
    const lateDeliveries = completedTasks.filter(
      (task) => task.completedAt && task.completedAt.getTime() > task.deadline.getTime(),
    ).length;

    const unresolvedPenalty = anomalies.reduce((score, anomaly) => {
      const weight =
        anomaly.severity === "CRITICAL"
          ? 15
          : anomaly.severity === "HIGH"
            ? 10
            : anomaly.severity === "MEDIUM"
              ? 6
              : 3;

      return score + (anomaly.resolved ? weight / 2 : weight);
    }, 0);

    const baselineCompliance =
      tasks.length > 0
        ? Math.round(tasks.reduce((sum, task) => sum + task.complianceScore, 0) / tasks.length)
        : 100;

    const score = Math.max(
      10,
      Math.min(100, baselineCompliance - unresolvedPenalty - lateDeliveries * 4 - Math.max(0, justifications - 4)),
    );

    const metrics = {
      taskCount: tasks.length,
      completedTaskCount: completedTasks.length,
      anomalyCount: anomalies.length,
      lateDeliveries,
      justificationCount: justifications,
      baselineCompliance,
    };

    return prisma.driverScore.upsert({
      where: {
        driverId,
      },
      update: {
        score,
        metrics,
      },
      create: {
        driverId,
        score,
        metrics,
      },
    });
  }
}
