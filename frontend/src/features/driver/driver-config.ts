import type { ShellNavItem } from "@/components/app/AppShell";
import type { DriverOverview } from "@/types/domain";

export const driverShellTitle = "Execute trips with compliance confidence";

export const driverShellSubtitle =
  "Focus on your own route, truck, payment, proof capture, and trip paperwork with a cleaner multi-page workspace and no hidden monitoring logic exposed.";

export const driverNavItems: ShellNavItem[] = [
  { label: "Current route", to: "/app/driver/route" },
  { label: "Trips", to: "/app/driver/trips" },
  { label: "Invoices", to: "/app/driver/invoices" },
  { label: "Settings", to: "/app/driver/settings" },
];

export const driverSettingsDefaults = {
  showCheckpoints: true,
  showTelemetryLabels: true,
  cameraHints: true,
  showRecentTelemetry: true,
};

export const driverSettingsOptions = [
  {
    key: "showCheckpoints",
    label: "Checkpoint markers",
    description: "Display every seeded city and area milestone along the assigned route.",
  },
  {
    key: "showTelemetryLabels",
    label: "Telemetry labels",
    description: "Pin the latest city and area label over the active route marker for quick orientation.",
  },
  {
    key: "cameraHints",
    label: "Camera guidance",
    description: "Show proof-capture tips so stop validation photos stay compliance-ready while driving demos.",
  },
  {
    key: "showRecentTelemetry",
    label: "Recent telemetry",
    description: "Keep the latest route snapshots visible below the current trip board.",
  },
];

export const formatDriverCurrency = (value?: number | string | null) => `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`;

export const formatDriverDuration = (minutes?: number | null) => {
  if (!minutes) {
    return "Pending";
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder} min`;
  }

  return `${hours}h ${remainder}m`;
};

export const buildDriverMetricCards = (overview?: DriverOverview | null) => [
  {
    label: "Total trips",
    value: overview?.metrics.totalTrips ?? 0,
    description: "Assignments currently attached to your account",
  },
  {
    label: "Planned km",
    value: Number(overview?.metrics.routeKm ?? 0).toFixed(0),
    description: "Total seeded corridor distance in your queue",
  },
  {
    label: "Load kg",
    value: Number(overview?.metrics.totalLoadKg ?? 0).toLocaleString("en-IN"),
    description: "Combined payload expected across current assignments",
  },
  {
    label: "Trust score",
    value: overview?.score?.score ?? 100,
    description: "Your compliance posture based on route, stops, and timing",
  },
];
