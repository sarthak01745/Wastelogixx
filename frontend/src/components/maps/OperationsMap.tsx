import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { latLngBounds } from "leaflet";
import type { GeoLine, LocationLog, RouteCheckpoint } from "@/types/domain";

type FleetPoint = {
  taskId?: string | null;
  truckNumber: string;
  driverName: string | null;
  currentLat: number | null;
  currentLng: number | null;
  riskLevel?: string | null;
  routeLabel?: string | null;
  loadType?: string | null;
  loadWeightKg?: number | null;
  model?: string | null;
};

type OperationsMapProps = {
  fleet?: FleetPoint[];
  expectedPath?: GeoLine | null;
  routeCheckpoints?: RouteCheckpoint[] | null;
  actualTrail?: LocationLog[];
  focusedIndex?: number;
  showCheckpoints?: boolean;
  showTelemetryLabels?: boolean;
  heightClassName?: string;
  activeTaskId?: string | null;
  onFleetSelect?: (taskId: string) => void;
};

const buildTruckIcon = (label: string, active = false) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;min-width:102px;height:34px;padding:0 10px;background:${active ? "#fbbc05" : "#111827"};color:${active ? "#111827" : "#f7f1de"};border:3px solid #111827;border-radius:13px;font-size:9.5px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;box-shadow:4px 4px 0 ${active ? "#1a73e8" : "#fbbc05"};">${label}</div>`,
    iconSize: [112, 36],
    iconAnchor: [56, 18],
  });

const checkpointIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:6px;background:#fbbc05;border:3px solid #111827;box-shadow:3px 3px 0 #111827;"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const defaultCenter: [number, number] = [10.7905, 78.7047];

const formatWeight = (value?: number | null) => (value ? `${value.toLocaleString()} kg` : "N/A");

const formatSpeed = (value?: number | null) => (value ? `${Math.round(value)} km/h` : "Stationary");

const ViewportController = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 10, { animate: false });
      return;
    }

    map.fitBounds(latLngBounds(points), {
      animate: false,
      padding: [34, 34],
    });
  }, [map, points]);

  return null;
};

export const OperationsMap = ({
  fleet,
  expectedPath,
  routeCheckpoints,
  actualTrail,
  focusedIndex,
  showCheckpoints = true,
  showTelemetryLabels = true,
  heightClassName = "h-[360px]",
  activeTaskId,
  onFleetSelect,
}: OperationsMapProps) => {
  const routeCoordinates = useMemo(
    () => expectedPath?.coordinates?.map((coordinate) => [coordinate[1], coordinate[0]] as [number, number]) ?? [],
    [expectedPath],
  );

  const actualCoordinates = useMemo(
    () => actualTrail?.map((log) => [log.lat, log.lng] as [number, number]) ?? [],
    [actualTrail],
  );

  const fleetCoordinates = useMemo(
    () =>
      fleet
        ?.filter((item) => item.currentLat !== null && item.currentLng !== null)
        .map((item) => [item.currentLat as number, item.currentLng as number] as [number, number]) ?? [],
    [fleet],
  );

  const allPoints = useMemo(
    () => [...routeCoordinates, ...actualCoordinates, ...fleetCoordinates],
    [actualCoordinates, fleetCoordinates, routeCoordinates],
  );

  const center = useMemo<[number, number]>(() => allPoints[0] ?? defaultCenter, [allPoints]);

  return (
    <div className={`overflow-hidden rounded-[26px] border-3 border-ink bg-[#dbe8ff] shadow-panel ${heightClassName}`}>
      <MapContainer center={center} zoom={8} className="h-full w-full">
        <ViewportController points={allPoints} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routeCoordinates.length > 0 ? (
          <>
            <Polyline positions={routeCoordinates} pathOptions={{ color: "#fbbc05", weight: 10, opacity: 0.28 }} />
            <Polyline positions={routeCoordinates} pathOptions={{ color: "#1a73e8", weight: 5 }} />
          </>
        ) : null}
        {actualCoordinates.length > 0 ? <Polyline positions={actualCoordinates} pathOptions={{ color: "#111827", weight: 4, dashArray: "10 10" }} /> : null}

        {showCheckpoints
          ? routeCheckpoints?.map((checkpoint) => (
              <Marker
                key={`${checkpoint.cityName}-${checkpoint.areaName}-${checkpoint.odometerKm}`}
                position={[checkpoint.lat, checkpoint.lng]}
                icon={checkpointIcon}
              >
                <Popup>
                  <div className="text-sm font-black text-ink">{checkpoint.areaName}</div>
                  <div className="text-sm text-ink-muted">{checkpoint.cityName}</div>
                  <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
                    {checkpoint.odometerKm} km checkpoint
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        {fleet?.map((truck) =>
          truck.currentLat && truck.currentLng ? (
            <Marker
              key={`${truck.truckNumber}-${truck.currentLat}-${truck.currentLng}`}
              position={[truck.currentLat, truck.currentLng]}
              icon={buildTruckIcon(truck.truckNumber, Boolean(activeTaskId && truck.taskId === activeTaskId))}
              eventHandlers={
                truck.taskId && onFleetSelect
                  ? {
                      click: () => onFleetSelect(truck.taskId!),
                    }
                  : undefined
              }
            >
              <Popup>
                <div className="text-sm font-black text-ink">{truck.truckNumber}</div>
                <div className="text-sm text-ink-muted">{truck.driverName ?? "Unassigned driver"}</div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                  {truck.model ?? "Fleet vehicle"}
                </div>
                {truck.routeLabel ? <div className="mt-2 text-sm text-ink">{truck.routeLabel}</div> : null}
                {truck.loadType ? <div className="mt-1 text-sm text-ink-muted">{truck.loadType}</div> : null}
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                  Load {formatWeight(truck.loadWeightKg)} - Risk {truck.riskLevel ?? "LOW"}
                </div>
              </Popup>
            </Marker>
          ) : null,
        )}

        {actualTrail?.map((point, index) => {
          const isFocused = focusedIndex === index;
          const isLatest = index === actualTrail.length - 1;

          return (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={isFocused ? 8 : isLatest ? 7 : 5}
              pathOptions={{
                color: isFocused ? "#ea4335" : isLatest ? "#1a73e8" : "#34a853",
                fillOpacity: 0.92,
              }}
            >
              <Popup>
                <div className="text-sm font-black text-ink">{point.areaName ?? "Active waypoint"}</div>
                <div className="text-sm text-ink-muted">{point.cityName ?? "In transit"}</div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                  {point.odometerKm ? `${point.odometerKm.toFixed(0)} km logged` : "Distance pending"}
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  {formatSpeed(point.speedKph)} - {new Date(point.timestamp).toLocaleString()}
                </div>
              </Popup>

              {showTelemetryLabels && (isFocused || isLatest) ? (
                <Tooltip direction="top" offset={[0, -10]} permanent>
                  <div className="text-xs font-black text-ink">
                    {point.cityName ?? "Waypoint"} / {point.areaName ?? "Route"}
                  </div>
                </Tooltip>
              ) : null}
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};
