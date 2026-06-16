import { Prisma, UserRole } from "@prisma/client";
import { mkdir } from "fs/promises";
import path from "path";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/api-error";
import { renderPdf } from "../utils/pdf";
import { AuditService } from "./audit.service";

const money = (value: Prisma.Decimal | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value));

export class InvoiceService {
  static async generate(tripId: string, requester: Express.UserPayload) {
    const task = await prisma.task.findUnique({
      where: {
        id: tripId,
      },
      include: {
        driver: true,
        truck: true,
        invoice: true,
      },
    });

    if (!task) {
      throw new ApiError(404, "Trip was not found");
    }

    if (requester.role !== UserRole.ADMIN && task.driverId !== requester.id) {
      throw new ApiError(403, "You do not have access to this invoice");
    }

    const fileName = `invoice-${tripId}.pdf`;
    const invoicesDir = path.resolve(process.cwd(), "uploads", "invoices");
    await mkdir(invoicesDir, { recursive: true });

    const filePath = path.join(invoicesDir, fileName);

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; padding: 16px; }
            .wrap { border: 3px solid #111827; border-radius: 20px; padding: 24px; }
            .title { display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px; }
            .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #e5f0ff; color: #1a73e8; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            td, th { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
            .total { margin-top: 24px; font-size: 28px; font-weight: 800; }
            .meta { color: #4b5563; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="title">
              <div>
                <div class="badge">WasteLogix</div>
                <h1>Trip Invoice</h1>
                <p class="meta">Trip ID: ${task.id}</p>
                <p class="meta">Generated: ${new Date().toLocaleString()}</p>
              </div>
              <div>
                <p><strong>Driver:</strong> ${task.driver.name}</p>
                <p><strong>Truck:</strong> ${task.truck.truckNumber}</p>
                <p><strong>Status:</strong> ${task.status}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Scheduled</th>
                  <th>Deadline</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${task.routeStart}</td>
                  <td>${task.routeEnd}</td>
                  <td>${task.scheduledTime.toLocaleString()}</td>
                  <td>${task.deadline.toLocaleString()}</td>
                  <td>${money(task.paymentAmount)}</td>
                </tr>
              </tbody>
            </table>
            <div class="total">Total due: ${money(task.paymentAmount)}</div>
            <p class="meta">Compliance score: ${task.complianceScore}/100 | Risk level: ${task.riskLevel}</p>
            <p class="meta">Manifest: ${task.manifestCode ?? "Pending"} | Load: ${task.loadType ?? "Waste consignment"} | Weight: ${task.loadWeightKg ?? 0} kg</p>
          </div>
        </body>
      </html>
    `;

    await renderPdf(html, filePath);

    const pdfUrl = `${env.APP_URL}/uploads/invoices/${fileName}`;

    const invoice = await prisma.invoice.upsert({
      where: {
        tripId,
      },
      update: {
        pdfUrl,
        totalAmount: task.paymentAmount,
        generatedAt: new Date(),
      },
      create: {
        tripId,
        pdfUrl,
        totalAmount: task.paymentAmount,
      },
    });

    await AuditService.record({
      actorId: requester.id,
      entityType: "Invoice",
      entityId: invoice.id,
      action: "GENERATED",
      payload: {
        tripId,
      },
    });

    return invoice;
  }

  static async listForUser(requester: Express.UserPayload) {
    return prisma.invoice.findMany({
      where:
        requester.role === UserRole.ADMIN
          ? undefined
          : {
              task: {
                driverId: requester.id,
              },
            },
      orderBy: {
        generatedAt: "desc",
      },
      include: {
        task: {
          include: {
            truck: true,
          },
        },
      },
    });
  }
}
