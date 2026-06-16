import { useMutation } from "@tanstack/react-query";
import { Camera, MapPinned, Play, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DriverMetricsGrid } from "@/components/driver/DriverMetricsGrid";
import { OperationsMap } from "@/components/maps/OperationsMap";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatDriverCurrency, formatDriverDuration } from "@/features/driver/driver-config";
import { taskApi } from "@/services/api/tasks";
import { useDriverLayout } from "./DriverLayout";

const DriverRoutePage = () => {
  const { dashboardData, currentTrip, settings, refreshDriverOverview, openStopValidation } = useDriverLayout();

  const startMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.start(taskId),
    onSuccess: () => {
      toast.success("Trip started.");
      refreshDriverOverview();
    },
    onError: () => toast.error("Trip start failed."),
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => taskApi.complete(taskId),
    onSuccess: () => {
      toast.success("Trip completed.");
      refreshDriverOverview();
    },
    onError: () => toast.error("Trip completion failed."),
  });

  return (
    <div className="space-y-5">
      <DriverMetricsGrid overview={dashboardData} />

      {dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
        <div className="space-y-3">
          {dashboardData.alerts.map((alert) => (
            <div key={alert.id} className="rounded-[22px] border-3 border-ink bg-[#fceceb] p-4 shadow-panel-sm">
              <div className="flex items-center gap-3">
                <StatusPill value={alert.severity} />
                <h3 className="font-black text-ink">{alert.title}</h3>
              </div>
              <p className="mt-2 text-sm font-bold text-ink">{alert.message}</p>
              <div className="mt-3 flex gap-3">
                {alert.message.toLowerCase().includes("photo") || alert.message.toLowerCase().includes("justify") ? (
                  <button className="neo-button bg-accent-yellow text-ink px-4 py-2 text-xs" onClick={openStopValidation} type="button">
                    <Camera size={14} className="mr-1 inline-block" />
                    Provide Photo/Justification
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Current route</div>
              <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.3rem]">
                {currentTrip
                  ? `${currentTrip.routeStartCity ?? currentTrip.routeStart} to ${currentTrip.routeEndCity ?? currentTrip.routeEnd}`
                  : "No active trip assigned"}
              </h2>
              {currentTrip ? (
                <p className="mt-2.5 text-[12px] leading-5 text-ink-muted">
                  {currentTrip.routeStartArea ?? currentTrip.routeStart} to {currentTrip.routeEndArea ?? currentTrip.routeEnd}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <StatusPill value={currentTrip?.status} />
              <StatusPill value={currentTrip?.riskLevel} />
            </div>
          </div>

          <div className="mt-5">
            <OperationsMap
              actualTrail={currentTrip?.locationLogs}
              expectedPath={currentTrip?.expectedPath}
              routeCheckpoints={currentTrip?.routeCheckpoints}
              showCheckpoints={settings.showCheckpoints}
              showTelemetryLabels={settings.showTelemetryLabels}
              heightClassName="h-[400px]"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {currentTrip?.status === "ASSIGNED" ? (
              <button className="neo-button bg-accent-blue text-paper" onClick={() => startMutation.mutate(currentTrip.id)} type="button">
                <Play size={16} />
                Start trip
              </button>
            ) : null}
            {currentTrip?.status === "IN_PROGRESS" ? (
              <button className="neo-button bg-ink text-paper" onClick={() => completeMutation.mutate(currentTrip.id)} type="button">
                <ShieldCheck size={16} />
                Complete trip
              </button>
            ) : null}
            {currentTrip ? (
              <button className="neo-button bg-accent-yellow text-ink" onClick={openStopValidation} type="button">
                <MapPinned size={16} />
                Validate stop
              </button>
            ) : null}
          </div>
        </section>

        <section className="panel-card">
          <div className="eyebrow">Route status</div>
          <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Truck, payload, and timing</h2>
          <div className="mt-4.5 space-y-2.5">
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Truck and plate</div>
              <div className="mt-3 text-lg font-black text-ink">{currentTrip?.truck?.truckNumber ?? "No truck assigned"}</div>
              <div className="mt-2 text-sm text-ink-muted">
                {currentTrip?.truck?.model ?? "Fleet vehicle"} / {currentTrip?.truck?.capacityKg?.toLocaleString() ?? 0} kg capacity
              </div>
              <div className="mt-1 text-sm text-ink-muted">{currentTrip?.truck?.homeBase ?? "Awaiting dispatch yard"}</div>
            </div>
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Payload and manifest</div>
              <div className="mt-3 text-lg font-black text-ink">{currentTrip?.loadType ?? "No active payload"}</div>
              <div className="mt-2 text-sm text-ink-muted">
                {currentTrip?.loadWeightKg?.toLocaleString() ?? 0} kg / {currentTrip?.loadUnits ?? 0} units
              </div>
              <div className="mt-1 text-sm text-ink-muted">{currentTrip?.manifestCode ?? "Manifest pending"}</div>
            </div>
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Distance, time, payment</div>
              <div className="mt-3 text-lg font-black text-ink">
                {Number(currentTrip?.actualDistanceKm ?? currentTrip?.expectedDistanceKm ?? 0).toFixed(0)} km
              </div>
              <div className="mt-2 text-sm text-ink-muted">
                {formatDriverDuration(currentTrip?.estimatedDuration)} / {formatDriverCurrency(currentTrip?.paymentAmount)}
              </div>
              <div className="mt-1 text-sm text-ink-muted">
                Deadline {currentTrip ? new Date(currentTrip.deadline).toLocaleString() : "Pending"}
              </div>
            </div>
            {settings.cameraHints ? (
              <div className="rounded-[20px] border-3 border-ink bg-[#f7f1de] p-3.5 shadow-panel-sm">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-ink">
                  <Camera size={16} />
                  Proof capture tip
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  Use the live camera to capture the truck, surroundings, and number plate in one frame whenever the app prompts for stop validation.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {settings.showRecentTelemetry && currentTrip ? (
        <section className="panel-card">
          <div className="eyebrow">Recent telemetry</div>
          <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Latest route snapshots</h2>
          <div className="mt-4.5 grid gap-3 xl:grid-cols-4">
            {currentTrip.locationLogs?.slice(-4).reverse().map((log) => (
              <article key={log.id} className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
                <div className="text-base font-black text-ink">{log.areaName ?? "Waypoint"}</div>
                <div className="text-sm text-ink-muted">{log.cityName ?? "In transit"}</div>
                <div className="mt-3 text-sm font-bold text-ink">
                  {log.odometerKm ? `${log.odometerKm.toFixed(0)} km logged` : "Distance pending"}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  {log.speedKph ? `${Math.round(log.speedKph)} km/h` : "Stopped"}
                </div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default DriverRoutePage;
