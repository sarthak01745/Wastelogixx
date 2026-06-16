import { PrismaClient, RiskLevel, Severity, TaskStatus, TruckStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { ensureAuthUser } from "../src/lib/supabase-auth";

const prisma = new PrismaClient();

type RoutePoint = {
  cityName: string;
  areaName: string;
  lat: number;
  lng: number;
  odometerKm: number;
  speedKph: number;
};

type RouteSeed = {
  id: string;
  driverEmail: string;
  truckNumber: string;
  assignedByEmail: string;
  routeStart: string;
  routeEnd: string;
  routeStartCity: string;
  routeStartArea: string;
  routeEndCity: string;
  routeEndArea: string;
  loadType: string;
  loadWeightKg: number;
  loadUnits: number;
  manifestCode: string;
  expectedDistanceKm: number;
  estimatedDuration: number;
  paymentAmount: number;
  status: TaskStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  complianceScore: number;
  scheduledOffsetHours: number;
  deadlineOffsetHours: number;
  startedOffsetHours?: number;
  completedOffsetHours?: number;
  path: RoutePoint[];
  activeLogCount?: number;
  anomaly?: {
    type: "DEVIATION" | "LONG_STOP" | "GPS_SPOOF" | "MULTI_STOP" | "GEOFENCE" | "DUPLICATE_IMAGE";
    severity: Severity;
    message: string;
  };
  stopReason?: string;
};

const hashChain = (previousHash: string | null, payload: unknown) =>
  createHash("sha256")
    .update(JSON.stringify({ previousHash: previousHash ?? "GENESIS", payload }))
    .digest("hex");

const routeCheckpoints = (path: RoutePoint[]) =>
  path.map((point) => ({
    cityName: point.cityName,
    areaName: point.areaName,
    lat: point.lat,
    lng: point.lng,
    odometerKm: point.odometerKm,
  }));

const expectedPath = (path: RoutePoint[]) => ({
  type: "LineString",
  coordinates: path.map((point) => [point.lng, point.lat]),
});

const users = [
  { name: "Operations Admin", email: "admin@smartwaste.io", password: "Password@123", role: UserRole.ADMIN },
  { name: "Dummy Admin", email: "dummy.admin@routeshield.io", password: "Admin@12345", role: UserRole.ADMIN },
  { name: "Ravi Kumar", email: "driver.one@smartwaste.io", password: "Password@123", role: UserRole.DRIVER },
  { name: "Asha Singh", email: "driver.two@smartwaste.io", password: "Password@123", role: UserRole.DRIVER },
  { name: "Dummy Driver", email: "dummy.driver@routeshield.io", password: "Driver@12345", role: UserRole.DRIVER },
  { name: "Karthik Raj", email: "driver.three@smartwaste.io", password: "Password@123", role: UserRole.DRIVER },
  { name: "Meera Nair", email: "driver.four@smartwaste.io", password: "Password@123", role: UserRole.DRIVER },
  { name: "WasteLogix Hardware Relay", email: "hardware.relay@wastelogix.io", password: "Hardware@12345", role: UserRole.DRIVER },
];

const trucks = [
  {
    truckNumber: "TN-45-WL-2201",
    driverEmail: "driver.one@smartwaste.io",
    model: "Tata Ultra T.16",
    homeBase: "Tiruchirappalli - Ariyamangalam Yard",
    capacityKg: 14000,
    deviceKey: "DEVICE-TN452201",
    status: TruckStatus.AVAILABLE,
  },
  {
    truckNumber: "KA-01-TR-9087",
    driverEmail: "driver.two@smartwaste.io",
    model: "Ashok Leyland 1618",
    homeBase: "Bengaluru - Peenya Compliance Hub",
    capacityKg: 15000,
    deviceKey: "DEVICE-KA019087",
    status: TruckStatus.AVAILABLE,
  },
  {
    truckNumber: "TN-48-WL-3108",
    driverEmail: "dummy.driver@routeshield.io",
    model: "Eicher Pro 2114XP",
    homeBase: "Tiruchirappalli - Samayapuram Transfer Yard",
    capacityKg: 12500,
    deviceKey: "DEVICE-TN483108",
    status: TruckStatus.AVAILABLE,
  },
  {
    truckNumber: "TN-59-WL-7715",
    driverEmail: "driver.three@smartwaste.io",
    model: "BharatBenz 1723R",
    homeBase: "Madurai - Avaniyapuram Recovery Park",
    capacityKg: 16000,
    deviceKey: "DEVICE-TN597715",
    status: TruckStatus.AVAILABLE,
  },
  {
    truckNumber: "KL-07-WL-6612",
    driverEmail: "driver.four@smartwaste.io",
    model: "Mahindra Blazo X 28",
    homeBase: "Kochi - Edappally Eco Logistics Park",
    capacityKg: 18000,
    deviceKey: "DEVICE-KL076612",
    status: TruckStatus.AVAILABLE,
  },
  {
    truckNumber: "TN-45-WL-9900",
    driverEmail: "hardware.relay@wastelogix.io",
    model: "WasteLogix Live Relay Unit",
    homeBase: "Tiruchirappalli - Live hardware reserve bay",
    capacityKg: 12000,
    deviceKey: "HARDWARE-TN459900",
    status: TruckStatus.OFFLINE,
  },
];

const regionalAllowedZone = {
  type: "Polygon",
  coordinates: [[
    [76.8, 8.7],
    [80.7, 8.7],
    [80.7, 13.6],
    [76.8, 13.6],
    [76.8, 8.7],
  ]],
};

const restrictedZone = {
  type: "Polygon",
  coordinates: [[
    [78.6705, 10.835],
    [78.6905, 10.835],
    [78.6905, 10.855],
    [78.6705, 10.855],
    [78.6705, 10.835],
  ]],
};

const now = new Date();

const routes: RouteSeed[] = [
  {
    id: "seed-trip-trichy-chennai",
    driverEmail: "driver.one@smartwaste.io",
    truckNumber: "TN-45-WL-2201",
    assignedByEmail: "admin@smartwaste.io",
    routeStart: "Ariyamangalam Transfer Station, Tiruchirappalli",
    routeEnd: "Kodungaiyur Material Recovery Hub, Chennai",
    routeStartCity: "Tiruchirappalli",
    routeStartArea: "Ariyamangalam",
    routeEndCity: "Chennai",
    routeEndArea: "Kodungaiyur",
    loadType: "Segregated municipal dry waste",
    loadWeightKg: 8200,
    loadUnits: 126,
    manifestCode: "TN-CHN-MSW-1001",
    expectedDistanceKm: 336,
    estimatedDuration: 390,
    paymentAmount: 12850,
    status: TaskStatus.IN_PROGRESS,
    riskLevel: RiskLevel.MEDIUM,
    riskScore: 34,
    complianceScore: 66,
    scheduledOffsetHours: -8,
    deadlineOffsetHours: 5,
    startedOffsetHours: -7.5,
    path: [
      { cityName: "Tiruchirappalli", areaName: "Ariyamangalam", lat: 10.7903, lng: 78.7234, odometerKm: 0, speedKph: 0 },
      { cityName: "Tiruchirappalli", areaName: "Thuvakudi", lat: 10.7554, lng: 78.8134, odometerKm: 21, speedKph: 43 },
      { cityName: "Perambalur", areaName: "New Bus Stand", lat: 11.2333, lng: 78.8833, odometerKm: 83, speedKph: 62 },
      { cityName: "Ulundurpet", areaName: "NH Service Road", lat: 11.6905, lng: 79.2879, odometerKm: 171, speedKph: 64 },
      { cityName: "Villupuram", areaName: "Bypass Toll Corridor", lat: 11.9398, lng: 79.4924, odometerKm: 214, speedKph: 59 },
      { cityName: "Tindivanam", areaName: "Melmaruvathur Stretch", lat: 12.2266, lng: 79.6536, odometerKm: 248, speedKph: 52 },
      { cityName: "Chengalpattu", areaName: "GST Road", lat: 12.6819, lng: 79.9835, odometerKm: 300, speedKph: 48 },
      { cityName: "Chennai", areaName: "Kodungaiyur", lat: 13.1366, lng: 80.2584, odometerKm: 336, speedKph: 32 },
    ],
    activeLogCount: 6,
    anomaly: {
      type: "LONG_STOP",
      severity: Severity.MEDIUM,
      message: "Unexpected 18 minute hold near Villupuram bypass weighbridge.",
    },
    stopReason: "Traffic police documentation check near Villupuram weighbridge.",
  },
  {
    id: "seed-trip-trichy-bengaluru",
    driverEmail: "driver.two@smartwaste.io",
    truckNumber: "KA-01-TR-9087",
    assignedByEmail: "admin@smartwaste.io",
    routeStart: "Thuvakudi Industrial Waste Yard, Tiruchirappalli",
    routeEnd: "Peenya Compliance Processing Hub, Bengaluru",
    routeStartCity: "Tiruchirappalli",
    routeStartArea: "Thuvakudi",
    routeEndCity: "Bengaluru",
    routeEndArea: "Peenya",
    loadType: "Industrial scrap and packaging residue",
    loadWeightKg: 9400,
    loadUnits: 88,
    manifestCode: "TN-BLR-IND-1043",
    expectedDistanceKm: 346,
    estimatedDuration: 430,
    paymentAmount: 13600,
    status: TaskStatus.DELAYED,
    riskLevel: RiskLevel.HIGH,
    riskScore: 67,
    complianceScore: 33,
    scheduledOffsetHours: -18,
    deadlineOffsetHours: -2,
    startedOffsetHours: -17,
    path: [
      { cityName: "Tiruchirappalli", areaName: "Thuvakudi", lat: 10.7554, lng: 78.8134, odometerKm: 0, speedKph: 0 },
      { cityName: "Namakkal", areaName: "Mohanur Road", lat: 11.2194, lng: 78.1674, odometerKm: 103, speedKph: 60 },
      { cityName: "Salem", areaName: "Kondalampatti Bypass", lat: 11.6234, lng: 78.146, odometerKm: 165, speedKph: 58 },
      { cityName: "Dharmapuri", areaName: "Collectorate Road", lat: 12.1277, lng: 78.1584, odometerKm: 229, speedKph: 57 },
      { cityName: "Hosur", areaName: "Sipcot Phase 2", lat: 12.7409, lng: 77.8253, odometerKm: 304, speedKph: 24 },
      { cityName: "Bengaluru", areaName: "Peenya", lat: 13.0329, lng: 77.5273, odometerKm: 346, speedKph: 18 },
    ],
    activeLogCount: 5,
    anomaly: {
      type: "MULTI_STOP",
      severity: Severity.HIGH,
      message: "Repeated unplanned stops detected between Dharmapuri and Hosur corridor.",
    },
    stopReason: "Driver reported toll backlog and axle inspection near Hosur.",
  },
  {
    id: "seed-trip-trichy-madurai",
    driverEmail: "dummy.driver@routeshield.io",
    truckNumber: "TN-48-WL-3108",
    assignedByEmail: "dummy.admin@routeshield.io",
    routeStart: "Srirangam Collection Node, Tiruchirappalli",
    routeEnd: "Avaniyapuram Recovery Park, Madurai",
    routeStartCity: "Tiruchirappalli",
    routeStartArea: "Srirangam",
    routeEndCity: "Madurai",
    routeEndArea: "Avaniyapuram",
    loadType: "Organic wet waste for compost sorting",
    loadWeightKg: 6800,
    loadUnits: 74,
    manifestCode: "TN-MDU-ORG-1092",
    expectedDistanceKm: 135,
    estimatedDuration: 185,
    paymentAmount: 8400,
    status: TaskStatus.COMPLETED,
    riskLevel: RiskLevel.LOW,
    riskScore: 12,
    complianceScore: 88,
    scheduledOffsetHours: -36,
    deadlineOffsetHours: -31,
    startedOffsetHours: -35.5,
    completedOffsetHours: -32.5,
    path: [
      { cityName: "Tiruchirappalli", areaName: "Srirangam", lat: 10.8629, lng: 78.6937, odometerKm: 0, speedKph: 0 },
      { cityName: "Manapparai", areaName: "Market Road", lat: 10.6075, lng: 78.425, odometerKm: 41, speedKph: 54 },
      { cityName: "Thuvarankurichi", areaName: "NH38 Junction", lat: 10.44, lng: 78.4871, odometerKm: 68, speedKph: 56 },
      { cityName: "Melur", areaName: "Bypass Circle", lat: 10.0327, lng: 78.3393, odometerKm: 108, speedKph: 52 },
      { cityName: "Madurai", areaName: "Avaniyapuram", lat: 9.8822, lng: 78.0846, odometerKm: 135, speedKph: 36 },
    ],
    activeLogCount: 5,
  },
  {
    id: "seed-trip-trichy-puducherry",
    driverEmail: "driver.three@smartwaste.io",
    truckNumber: "TN-59-WL-7715",
    assignedByEmail: "admin@smartwaste.io",
    routeStart: "Thillai Nagar Compliance Yard, Tiruchirappalli",
    routeEnd: "Lawspet Recycling Dock, Puducherry",
    routeStartCity: "Tiruchirappalli",
    routeStartArea: "Thillai Nagar",
    routeEndCity: "Puducherry",
    routeEndArea: "Lawspet",
    loadType: "Commercial paper bales and mixed plastic",
    loadWeightKg: 7200,
    loadUnits: 96,
    manifestCode: "TN-PDY-CMR-1164",
    expectedDistanceKm: 205,
    estimatedDuration: 285,
    paymentAmount: 9200,
    status: TaskStatus.ASSIGNED,
    riskLevel: RiskLevel.LOW,
    riskScore: 8,
    complianceScore: 92,
    scheduledOffsetHours: 6,
    deadlineOffsetHours: 11,
    path: [
      { cityName: "Tiruchirappalli", areaName: "Thillai Nagar", lat: 10.8277, lng: 78.6902, odometerKm: 0, speedKph: 0 },
      { cityName: "Lalgudi", areaName: "Main Road", lat: 10.8747, lng: 78.8195, odometerKm: 20, speedKph: 42 },
      { cityName: "Ariyalur", areaName: "Cement Town Link", lat: 11.1385, lng: 79.0746, odometerKm: 64, speedKph: 58 },
      { cityName: "Panruti", areaName: "Bus Stand", lat: 11.7764, lng: 79.5524, odometerKm: 152, speedKph: 61 },
      { cityName: "Puducherry", areaName: "Lawspet", lat: 11.9591, lng: 79.8083, odometerKm: 205, speedKph: 28 },
    ],
  },
  {
    id: "seed-trip-trichy-kochi",
    driverEmail: "driver.four@smartwaste.io",
    truckNumber: "KL-07-WL-6612",
    assignedByEmail: "dummy.admin@routeshield.io",
    routeStart: "Samayapuram Transfer Yard, Tiruchirappalli",
    routeEnd: "Edappally Eco Logistics Park, Kochi",
    routeStartCity: "Tiruchirappalli",
    routeStartArea: "Samayapuram",
    routeEndCity: "Kochi",
    routeEndArea: "Edappally",
    loadType: "E-waste pallets and sealed scrap drums",
    loadWeightKg: 10150,
    loadUnits: 62,
    manifestCode: "TN-KER-EWT-1217",
    expectedDistanceKm: 287,
    estimatedDuration: 420,
    paymentAmount: 14200,
    status: TaskStatus.IN_PROGRESS,
    riskLevel: RiskLevel.MEDIUM,
    riskScore: 41,
    complianceScore: 59,
    scheduledOffsetHours: -9,
    deadlineOffsetHours: 4,
    startedOffsetHours: -8.5,
    path: [
      { cityName: "Tiruchirappalli", areaName: "Samayapuram", lat: 10.8873, lng: 78.7343, odometerKm: 0, speedKph: 0 },
      { cityName: "Karur", areaName: "Pasupathipalayam", lat: 10.9601, lng: 78.0766, odometerKm: 82, speedKph: 60 },
      { cityName: "Coimbatore", areaName: "Gandhipuram", lat: 11.0168, lng: 76.9558, odometerKm: 203, speedKph: 63 },
      { cityName: "Palakkad", areaName: "Chandranagar", lat: 10.7867, lng: 76.6548, odometerKm: 248, speedKph: 47 },
      { cityName: "Kochi", areaName: "Edappally", lat: 10.0274, lng: 76.3089, odometerKm: 287, speedKph: 31 },
    ],
    activeLogCount: 4,
    anomaly: {
      type: "DEVIATION",
      severity: Severity.MEDIUM,
      message: "Temporary off-corridor movement detected near Palakkad bypass service lane.",
    },
    stopReason: "Short reroute near Palakkad due to lane closure toward Walayar sector.",
  },
  {
    id: "seed-trip-hardware-live-relay",
    driverEmail: "hardware.relay@wastelogix.io",
    truckNumber: "TN-45-WL-9900",
    assignedByEmail: "admin@smartwaste.io",
    routeStart: "Live Hardware Reserve Bay, Tiruchirappalli",
    routeEnd: "Ariyamangalam Transfer Station, Tiruchirappalli",
    routeStartCity: "Tiruchirappalli",
    routeStartArea: "Live Hardware Reserve Bay",
    routeEndCity: "Tiruchirappalli",
    routeEndArea: "Ariyamangalam",
    loadType: "Live hardware telemetry validation payload",
    loadWeightKg: 4200,
    loadUnits: 42,
    manifestCode: "TN-HW-LIVE-9001",
    expectedDistanceKm: 18,
    estimatedDuration: 35,
    paymentAmount: 2600,
    status: TaskStatus.ASSIGNED,
    riskLevel: RiskLevel.LOW,
    riskScore: 0,
    complianceScore: 100,
    scheduledOffsetHours: -1,
    deadlineOffsetHours: 5,
    path: [
      { cityName: "Tiruchirappalli", areaName: "Live Hardware Reserve Bay", lat: 10.7905, lng: 78.7047, odometerKm: 0, speedKph: 0 },
      { cityName: "Tiruchirappalli", areaName: "Thillai Nagar", lat: 10.8277, lng: 78.6902, odometerKm: 6, speedKph: 28 },
      { cityName: "Tiruchirappalli", areaName: "Gandhi Market", lat: 10.8171, lng: 78.6966, odometerKm: 10, speedKph: 24 },
      { cityName: "Tiruchirappalli", areaName: "Palakkarai", lat: 10.8056, lng: 78.7042, odometerKm: 13, speedKph: 21 },
      { cityName: "Tiruchirappalli", areaName: "Ariyamangalam", lat: 10.7903, lng: 78.7234, odometerKm: 18, speedKph: 18 },
    ],
  },
];

async function main() {
  const seededUsers = await Promise.all(
    users.map(async (user) => ({
      ...user,
      databasePassword: await bcrypt.hash(randomUUID(), 12),
    })),
  );

  const usersByEmail = new Map<string, { id: string; role: UserRole }>();

  for (const user of seededUsers) {
    const authUser = await ensureAuthUser({
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
    });

    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        authUserId: authUser.id,
        name: user.name,
        role: user.role,
        password: user.databasePassword,
      },
      create: {
        authUserId: authUser.id,
        name: user.name,
        email: user.email,
        password: user.databasePassword,
        role: user.role,
      },
      select: {
        id: true,
        role: true,
      },
    });

    usersByEmail.set(user.email, record);
  }

  const trucksByNumber = new Map<string, string>();

  for (const truck of trucks) {
    const driver = usersByEmail.get(truck.driverEmail);
    if (!driver) {
      throw new Error(`Driver not found for truck ${truck.truckNumber}`);
    }

    const record = await prisma.truck.upsert({
      where: { truckNumber: truck.truckNumber },
      update: {
        driverId: driver.id,
        model: truck.model,
        homeBase: truck.homeBase,
        capacityKg: truck.capacityKg,
        deviceKey: truck.deviceKey,
        status: truck.status,
      },
      create: {
        truckNumber: truck.truckNumber,
        driverId: driver.id,
        model: truck.model,
        homeBase: truck.homeBase,
        capacityKg: truck.capacityKg,
        status: truck.status,
        deviceKey: truck.deviceKey,
      },
      select: {
        id: true,
      },
    });

    trucksByNumber.set(truck.truckNumber, record.id);
  }

  for (const user of seededUsers.filter((entry) => entry.role === UserRole.DRIVER)) {
    const driver = usersByEmail.get(user.email);

    if (!driver) {
      continue;
    }

    await prisma.driverScore.upsert({
      where: {
        driverId: driver.id,
      },
      update: {},
      create: {
        driverId: driver.id,
        score: user.email === "hardware.relay@wastelogix.io" ? 100 : 96,
        metrics: {
          profile: user.email === "hardware.relay@wastelogix.io" ? "Reserved for live hardware feed" : "Ready for assignment",
        },
      },
    });
  }

  await Promise.all([
    prisma.geofence.upsert({
      where: { id: "south-india-waste-corridor" },
      update: {
        name: "South India Waste Corridor",
        geometry: regionalAllowedZone,
        kind: "ALLOWED",
      },
      create: {
        id: "south-india-waste-corridor",
        name: "South India Waste Corridor",
        kind: "ALLOWED",
        geometry: regionalAllowedZone,
      },
    }),
    prisma.geofence.upsert({
      where: { id: "trichy-restricted-dump-perimeter" },
      update: {
        name: "Trichy Restricted Dump Perimeter",
        geometry: restrictedZone,
        kind: "RESTRICTED",
      },
      create: {
        id: "trichy-restricted-dump-perimeter",
        name: "Trichy Restricted Dump Perimeter",
        kind: "RESTRICTED",
        geometry: restrictedZone,
      },
    }),
  ]);

  for (const route of routes) {
    const driver = usersByEmail.get(route.driverEmail);
    const assigner = usersByEmail.get(route.assignedByEmail);
    const truckId = trucksByNumber.get(route.truckNumber);

    if (!driver || !assigner || !truckId) {
      throw new Error(`Missing route dependencies for ${route.id}`);
    }

    const scheduledTime = new Date(now.getTime() + route.scheduledOffsetHours * 60 * 60 * 1000);
    const deadline = new Date(now.getTime() + route.deadlineOffsetHours * 60 * 60 * 1000);
    const startedAt = route.startedOffsetHours !== undefined
      ? new Date(now.getTime() + route.startedOffsetHours * 60 * 60 * 1000)
      : null;
    const completedAt = route.completedOffsetHours !== undefined
      ? new Date(now.getTime() + route.completedOffsetHours * 60 * 60 * 1000)
      : null;

    const activePoints = route.activeLogCount ? route.path.slice(0, route.activeLogCount) : [];
    const actualDistanceKm = Number(
      (route.status === TaskStatus.ASSIGNED ? 0 : activePoints[activePoints.length - 1]?.odometerKm ?? route.expectedDistanceKm).toFixed(1),
    );
    const currentPoint = route.status === TaskStatus.ASSIGNED
      ? route.path[0]
      : activePoints[activePoints.length - 1] ?? route.path[0];

    const task = await prisma.task.upsert({
      where: { id: route.id },
      update: {
        driverId: driver.id,
        truckId,
        assignedBy: assigner.id,
        routeStart: route.routeStart,
        routeEnd: route.routeEnd,
        routeStartCity: route.routeStartCity,
        routeStartArea: route.routeStartArea,
        routeEndCity: route.routeEndCity,
        routeEndArea: route.routeEndArea,
        expectedPath: expectedPath(route.path),
        routeCheckpoints: routeCheckpoints(route.path),
        scheduledTime,
        deadline,
        paymentAmount: route.paymentAmount,
        loadType: route.loadType,
        loadWeightKg: route.loadWeightKg,
        loadUnits: route.loadUnits,
        manifestCode: route.manifestCode,
        expectedDistanceKm: route.expectedDistanceKm,
        actualDistanceKm,
        estimatedDuration: route.estimatedDuration,
        status: route.status,
        startedAt,
        completedAt,
        riskLevel: route.riskLevel,
        riskScore: route.riskScore,
        complianceScore: route.complianceScore,
      },
      create: {
        id: route.id,
        driverId: driver.id,
        truckId,
        assignedBy: assigner.id,
        routeStart: route.routeStart,
        routeEnd: route.routeEnd,
        routeStartCity: route.routeStartCity,
        routeStartArea: route.routeStartArea,
        routeEndCity: route.routeEndCity,
        routeEndArea: route.routeEndArea,
        expectedPath: expectedPath(route.path),
        routeCheckpoints: routeCheckpoints(route.path),
        scheduledTime,
        deadline,
        paymentAmount: route.paymentAmount,
        loadType: route.loadType,
        loadWeightKg: route.loadWeightKg,
        loadUnits: route.loadUnits,
        manifestCode: route.manifestCode,
        expectedDistanceKm: route.expectedDistanceKm,
        actualDistanceKm,
        estimatedDuration: route.estimatedDuration,
        status: route.status,
        startedAt,
        completedAt,
        riskLevel: route.riskLevel,
        riskScore: route.riskScore,
        complianceScore: route.complianceScore,
      },
      select: {
        id: true,
      },
    });

    await prisma.locationLog.deleteMany({
      where: {
        tripId: task.id,
      },
    });

    let previousHash: string | null = null;
    const logsToCreate = route.status === TaskStatus.ASSIGNED ? [] : activePoints;

    for (let index = 0; index < logsToCreate.length; index += 1) {
      const point = logsToCreate[index];
      const timestamp = startedAt
        ? new Date(startedAt.getTime() + index * 55 * 60 * 1000)
        : new Date(scheduledTime.getTime() + index * 55 * 60 * 1000);
      const payload = {
        tripId: task.id,
        point,
        timestamp,
      };
      const hash = hashChain(previousHash, payload);

      await prisma.locationLog.create({
        data: {
          tripId: task.id,
          driverId: driver.id,
          truckId,
          lat: point.lat,
          lng: point.lng,
          cityName: point.cityName,
          areaName: point.areaName,
          odometerKm: point.odometerKm,
          speedKph: point.speedKph,
          heading: 90,
          timestamp,
          source: "DRIVER_APP",
          hash,
          previousHash,
          isOfflineCapture: false,
          insideAllowedZone: true,
          insideRestricted: false,
        },
      });

      previousHash = hash;
    }

    await prisma.anomaly.deleteMany({
      where: {
        tripId: task.id,
      },
    });

    await prisma.alert.deleteMany({
      where: {
        tripId: task.id,
      },
    });

    if (route.anomaly) {
      const anomaly = await prisma.anomaly.create({
        data: {
          tripId: task.id,
          driverId: driver.id,
          type: route.anomaly.type,
          severity: route.anomaly.severity,
          message: route.anomaly.message,
          resolved: false,
          metadata: {
            seeded: true,
            corridor: `${route.routeStartCity} - ${route.routeEndCity}`,
          },
          timestamp: startedAt ? new Date(startedAt.getTime() + 3 * 60 * 60 * 1000) : scheduledTime,
        },
      });

      await prisma.alert.create({
        data: {
          tripId: task.id,
          driverId: driver.id,
          anomalyId: anomaly.id,
          title: "Seeded compliance alert",
          message: route.anomaly.message,
          severity: route.anomaly.severity,
        },
      });
    }

    await prisma.stopJustification.deleteMany({
      where: {
        tripId: task.id,
      },
    });

    if (route.stopReason) {
      await prisma.stopJustification.create({
        data: {
          tripId: task.id,
          driverId: driver.id,
          reason: route.stopReason,
          imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
          imageHash: createHash("sha256").update(`${route.id}-proof`).digest("hex"),
          isDuplicate: false,
          timestamp: startedAt ? new Date(startedAt.getTime() + 3.5 * 60 * 60 * 1000) : scheduledTime,
        },
      });
    }

    await prisma.invoice.deleteMany({
      where: {
        tripId: task.id,
      },
    });

    if (route.status === TaskStatus.COMPLETED) {
      await prisma.invoice.create({
        data: {
          tripId: task.id,
          pdfUrl: `http://localhost:4000/uploads/invoices/${route.id}.pdf`,
          totalAmount: route.paymentAmount,
          generatedAt: completedAt ?? new Date(),
        },
      });
    }

    await prisma.truck.update({
      where: {
        id: truckId,
      },
      data: {
        driverId: driver.id,
        status:
          route.status === TaskStatus.IN_PROGRESS || route.status === TaskStatus.DELAYED
            ? TruckStatus.ON_ROUTE
            : TruckStatus.AVAILABLE,
        currentLat: currentPoint.lat,
        currentLng: currentPoint.lng,
        lastPingAt: route.status === TaskStatus.ASSIGNED ? null : new Date(),
      },
    });

    const driverScoreValue =
      route.riskLevel === RiskLevel.HIGH ? 58 : route.riskLevel === RiskLevel.MEDIUM ? 76 : 91;

    await prisma.driverScore.upsert({
      where: {
        driverId: driver.id,
      },
      update: {
        score: driverScoreValue,
        metrics: {
          lastRoute: `${route.routeStartCity} - ${route.routeEndCity}`,
          expectedDistanceKm: route.expectedDistanceKm,
          loadWeightKg: route.loadWeightKg,
          complianceScore: route.complianceScore,
        },
      },
      create: {
        driverId: driver.id,
        score: driverScoreValue,
        metrics: {
          lastRoute: `${route.routeStartCity} - ${route.routeEndCity}`,
          expectedDistanceKm: route.expectedDistanceKm,
          loadWeightKg: route.loadWeightKg,
          complianceScore: route.complianceScore,
        },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed completed with South India corridor mock data.");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
