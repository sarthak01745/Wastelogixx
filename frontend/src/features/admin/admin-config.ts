import type { ShellNavItem } from "@/components/app/AppShell";

export type AdminTaskForm = {
  driverId: string;
  truckId: string;
  routeStart: string;
  routeEnd: string;
  routeStartCity: string;
  routeStartArea: string;
  routeEndCity: string;
  routeEndArea: string;
  scheduledTime: string;
  deadline: string;
  paymentAmount: string;
  expectedDistanceKm: string;
  estimatedDuration: string;
  loadType: string;
  loadWeightKg: string;
  loadUnits: string;
  manifestCode: string;
  routeCheckpoints: string;
  expectedPath: string;
};

const formatDateInput = (date: Date) => date.toISOString().slice(0, 16);

export const adminShellTitle = "Command the waste transport network";

export const adminShellSubtitle =
  "Operate a Tiruchirappalli-centered South India corridor board with live trucks, replay, anomalies, distance, load, and trust performance without crowding every panel onto one page.";

export const adminNavItems: ShellNavItem[] = [
  { label: "Fleet map", to: "/app/admin/map" },
  { label: "Assign trips", to: "/app/admin/tasks" },
  { label: "Roster & invoices", to: "/app/admin/roster" },
  { label: "Trip replay", to: "/app/admin/replay" },
  { label: "Analysis", to: "/app/admin/analysis" },
  { label: "Driver info", to: "/app/admin/drivers" },
];

export const defaultPath = JSON.stringify(
  {
    type: "LineString",
    coordinates: [
      [78.7234, 10.7903],
      [78.8134, 10.7554],
      [78.8833, 11.2333],
      [79.2879, 11.6905],
      [79.4924, 11.9398],
      [79.6536, 12.2266],
      [79.9835, 12.6819],
      [80.2584, 13.1366],
    ],
  },
  null,
  2,
);

export const defaultCheckpoints = JSON.stringify(
  [
    { cityName: "Tiruchirappalli", areaName: "Ariyamangalam", lat: 10.7903, lng: 78.7234, odometerKm: 0 },
    { cityName: "Perambalur", areaName: "New Bus Stand", lat: 11.2333, lng: 78.8833, odometerKm: 83 },
    { cityName: "Villupuram", areaName: "Bypass Toll Corridor", lat: 11.9398, lng: 79.4924, odometerKm: 214 },
    { cityName: "Chengalpattu", areaName: "GST Road", lat: 12.6819, lng: 79.9835, odometerKm: 300 },
    { cityName: "Chennai", areaName: "Kodungaiyur", lat: 13.1366, lng: 80.2584, odometerKm: 336 },
  ],
  null,
  2,
);

export const adminSettingsDefaults = {
  showCheckpoints: true,
  showTelemetryLabels: true,
  autoReplay: false,
  denseFleetBoard: true,
};

export const adminSettingsOptions = [
  {
    key: "showCheckpoints",
    label: "Checkpoint markers",
    description: "Overlay area-level route milestones on the operations map and replay surface.",
  },
  {
    key: "showTelemetryLabels",
    label: "Telemetry labels",
    description: "Keep current city and area labels pinned to the latest live waypoint.",
  },
  {
    key: "autoReplay",
    label: "Auto replay",
    description: "Start trip playback automatically when a new corridor is selected.",
  },
  {
    key: "denseFleetBoard",
    label: "Dense fleet board",
    description: "Tighten the live truck cards so more trucks fit inside the same command view.",
  },
];

export const createTaskFormDefaults = (): AdminTaskForm => ({
  driverId: "",
  truckId: "",
  routeStart: "",
  routeEnd: "",
  routeStartCity: "",
  routeStartArea: "",
  routeEndCity: "",
  routeEndArea: "",
  scheduledTime: formatDateInput(new Date()),
  deadline: formatDateInput(new Date(Date.now() + 8 * 60 * 60 * 1000)),
  paymentAmount: "12850",
  expectedDistanceKm: "",
  estimatedDuration: "",
  loadType: "Segregated municipal dry waste",
  loadWeightKg: "8200",
  loadUnits: "126",
  manifestCode: "TN-CHN-MSW-NEW",
  routeCheckpoints: "",
  expectedPath: "",
});

export const formatCurrency = (value?: number | string | null) => `Rs ${Number(value ?? 0).toLocaleString("en-IN")}`;

export const formatDistance = (value?: number | null) => `${Number(value ?? 0).toFixed(0)} km`;

export const formatDuration = (minutes?: number | null) => {
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
