import { mkdir } from "fs/promises";
import path from "path";
import { ReportRange } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { renderPdf } from "../utils/pdf";
import { AuditService } from "./audit.service";
import { DashboardService } from "./dashboard.service";

export class ReportService {
  static async generate(period: ReportRange, actorId: string) {
    const range = DashboardService.getReportRange(period);

    const tasks = await prisma.task.findMany({
      where: {
        scheduledTime: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: {
        anomalies: true,
      },
    });

    const avgCompliance =
      tasks.length > 0
        ? Math.round(tasks.reduce((sum, task) => sum + task.complianceScore, 0) / tasks.length)
        : 0;
    const onTime = tasks.filter(
      (task) => task.completedAt && task.completedAt.getTime() <= task.deadline.getTime(),
    ).length;
    const anomalyCount = tasks.reduce((sum, task) => sum + task.anomalies.length, 0);

    const summary = {
      tripCount: tasks.length,
      avgCompliance,
      onTimeRate: tasks.length > 0 ? Math.round((onTime / tasks.length) * 100) : 0,
      anomalyCount,
    };

    const reportsDir = path.resolve(process.cwd(), "uploads", "invoices");
    await mkdir(reportsDir, { recursive: true });
    const fileName = `compliance-${period.toLowerCase()}-${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 20px; }
            .shell { border: 3px solid #111827; border-radius: 18px; padding: 24px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 24px; }
            .card { background: #f3f4f6; border-radius: 16px; padding: 16px; }
            .label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
            .value { font-size: 28px; font-weight: 800; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="shell">
            <h1>${period} Compliance Report</h1>
            <p>Coverage: ${range.start.toDateString()} to ${range.end.toDateString()}</p>
            <div class="grid">
              <div class="card"><div class="label">Trips</div><div class="value">${summary.tripCount}</div></div>
              <div class="card"><div class="label">Average compliance</div><div class="value">${summary.avgCompliance}</div></div>
              <div class="card"><div class="label">On-time rate</div><div class="value">${summary.onTimeRate}%</div></div>
              <div class="card"><div class="label">Anomalies</div><div class="value">${summary.anomalyCount}</div></div>
            </div>
          </div>
        </body>
      </html>
    `;

    await renderPdf(html, filePath);

    const report = await prisma.complianceReport.create({
      data: {
        type: period,
        rangeStart: range.start,
        rangeEnd: range.end,
        pdfUrl: `${env.APP_URL}/uploads/invoices/${fileName}`,
        summary,
      },
    });

    await AuditService.record({
      actorId,
      entityType: "ComplianceReport",
      entityId: report.id,
      action: "GENERATED",
      payload: summary,
    });

    return report;
  }
}
