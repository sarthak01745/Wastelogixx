export type UserRole = "ADMIN" | "DRIVER";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DELAYED";

export type GeoLine = {
  type: "LineString";
  coordinates: number[][];
};

export type RouteCheckpoint = {
  cityName: string;
  areaName: string;
  lat: number;
  lng: number;
  odometerKm: number;
};

export type PlaceLookup = {
  id: string;
  queryText?: string | null;
  displayName: string;
  formattedAddress: string;
  cityName?: string | null;
  areaName?: string | null;
  stateName?: string | null;
  countryCode?: string | null;
  lat: number;
  lng: number;
};

export type Truck = {
  id: string;
  truckNumber: string;
  status: string;
  model?: string | null;
  homeBase?: string | null;
  capacityKg?: number | null;
  currentLat?: number | null;
  currentLng?: number | null;
  lastPingAt?: string | null;
};

export type LocationLog = {
  id: string;
  lat: number;
  lng: number;
  cityName?: string | null;
  areaName?: string | null;
  odometerKm?: number | null;
  timestamp: string;
  speedKph?: number | null;
  heading?: number | null;
  source?: string;
};

export type Anomaly = {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  resolved: boolean;
  timestamp: string;
};

export type StopJustification = {
  id: string;
  reason: string;
  imageUrl: string;
  timestamp: string;
  isDuplicate: boolean;
};

export type Invoice = {
  id: string;
  tripId: string;
  pdfUrl: string;
  generatedAt: string;
  totalAmount: number | string;
};

export type Task = {
  id: string;
  driverId: string;
  truckId: string;
  routeStart: string;
  routeEnd: string;
  routeStartCity?: string | null;
  routeStartArea?: string | null;
  routeEndCity?: string | null;
  routeEndArea?: string | null;
  expectedPath: GeoLine;
  routeCheckpoints?: RouteCheckpoint[] | null;
  scheduledTime: string;
  deadline: string;
  paymentAmount: number | string;
  estimatedDuration?: number | null;
  loadType?: string | null;
  loadWeightKg?: number | null;
  loadUnits?: number | null;
  manifestCode?: string | null;
  expectedDistanceKm?: number | null;
  actualDistanceKm?: number | null;
  status: TaskStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  complianceScore: number;
  driver?: { id: string; name: string; email?: string };
  truck?: Truck;
  anomalies?: Anomaly[];
  locationLogs?: LocationLog[];
  stopJustifications?: StopJustification[];
  invoice?: Invoice | null;
};

export type AdminOverview = {
  metricCards: Array<{ label: string; value: number | string; trend: string }>;
  fleet: Array<{
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
  }>;
  driverScores: Array<{
    id: string;
    driverId: string;
    name: string;
    email: string;
    score: number;
    metrics?: Record<string, unknown> | null;
    updatedAt: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    severity: Severity;
    createdAt: string;
    tripId: string | null;
    driverName: string | null;
  }>;
  analytics: {
    anomalyByType: Record<string, number>;
    series: Array<{ label: string; trips: number; anomalies: number; avgCompliance: number }>;
  };
};

export type DriverOverview = {
  metrics: {
    totalTrips: number;
    completedTrips: number;
    pendingTrips: number;
    totalPayments: number;
    routeKm: number;
    totalLoadKg: number;
  };
  score: {
    score: number;
    metrics?: Record<string, unknown> | null;
    updatedAt: string;
  } | null;
  currentTrip: Task | null;
  upcomingTrips: Task[];
  recentInvoices: Task[];
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    severity: Severity;
    createdAt: string;
  }>;
};

export type TripReplay = {
  task: Task;
  timeline: LocationLog[];
  anomalies: Anomaly[];
  stops: StopJustification[];
};

export type RoutePlan = {
  origin: PlaceLookup;
  destination: PlaceLookup;
  routeStart: string;
  routeEnd: string;
  routeStartCity: string;
  routeStartArea: string;
  routeEndCity: string;
  routeEndArea: string;
  expectedPath: GeoLine;
  routeCheckpoints: RouteCheckpoint[];
  expectedDistanceKm: number;
  estimatedDuration: number;
  cache: {
    routePlanId: string;
  };
};

export type AuthResponse = {
  token: string;
  user: User;
};
