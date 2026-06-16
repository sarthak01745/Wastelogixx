import type { RiskLevel, Severity, TaskStatus } from "@prisma/client";

export type FleetTruckView = {
  truckId: string;
  truckNumber: string;
  status: string;
  model: string | null;
  homeBase: string | null;
  capacityKg: number | null;
  driverName: string | null;
  tripId: string | null;
  routeStart: string | null;
  routeEnd: string | null;
  loadType: string | null;
  loadWeightKg: number | null;
  expectedDistanceKm: number | null;
  currentLat: number | null;
  currentLng: number | null;
  riskLevel: RiskLevel | null;
  taskStatus: TaskStatus | null;
};

export type AdminMetricCard = {
  label: string;
  value: number | string;
  trend: string;
};

export type AlertView = {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  createdAt: Date;
  tripId: string | null;
  driverName: string | null;
};
