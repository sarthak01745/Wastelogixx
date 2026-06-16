import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertFeed } from "@/components/admin/AlertFeed";
import { OperationsMap } from "@/components/maps/OperationsMap";
import { MetricTile } from "@/components/shared/MetricTile";
import { SettingsPanel } from "@/components/shared/SettingsPanel";
import { StatusPill } from "@/components/shared/StatusPill";
import {
  adminSettingsDefaults,
  adminSettingsOptions,
  formatDistance,
  formatDuration,
} from "@/features/admin/admin-config";
import { useAdminRealtimeInvalidation } from "@/features/admin/useAdminRealtimeInvalidation";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { dashboardApi } from "@/services/api/dashboard";
import { taskApi } from "@/services/api/tasks";

const AdminMapPage = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { settings, toggleSetting } = useDashboardSettings("route-shield-admin-settings", adminSettingsDefaults);

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: dashboardApi.admin,
    refetchInterval: 20000,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: taskApi.list,
  });

  const replayQuery = useQuery({
    queryKey: ["task-replay", selectedTaskId],
    queryFn: () => taskApi.replay(selectedTaskId!),
    enabled: Boolean(selectedTaskId),
  });

  useAdminRealtimeInvalidation(selectedTaskId);

  useEffect(() => {
    const firstTask = tasksQuery.data?.[0];

    if (!selectedTaskId && firstTask) {
      setSelectedTaskId(firstTask.id);
    }
  }, [selectedTaskId, tasksQuery.data]);

  const loading = overviewQuery.isLoading || tasksQuery.isLoading;
  const metrics = overviewQuery.data?.metricCards ?? [];
  const tasks = tasksQuery.data ?? [];
  const selectedTask = replayQuery.data?.task ?? tasks.find((task) => task.id === selectedTaskId) ?? null;

  const fleetPreview = useMemo(
    () =>
      overviewQuery.data?.fleet.map((truck) => ({
        taskId: truck.tripId,
        truckNumber: truck.truckNumber,
        driverName: truck.driverName,
        currentLat: truck.currentLat,
        currentLng: truck.currentLng,
        riskLevel: truck.riskLevel,
        routeLabel: truck.routeStart && truck.routeEnd ? `${truck.routeStart} to ${truck.routeEnd}` : null,
        loadType: truck.loadType,
        loadWeightKg: truck.loadWeightKg,
        model: truck.model,
      })) ?? [],
    [overviewQuery.data?.fleet],
  );

  if (loading) {
    return <div className="panel-card text-sm text-ink-muted">Loading admin telemetry...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} description={metric.trend} label={metric.label} value={metric.value} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <section className="panel-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Fleet map</div>
              <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.3rem]">
                South India corridor command view
              </h2>
              <p className="mt-2.5 max-w-2xl text-[12px] leading-5 text-ink-muted">
                Track seeded Tiruchirappalli, Chennai, Bengaluru, Madurai, Puducherry, and Kochi routes with live positions,
                checkpoint overlays, and actual-vs-expected trail comparison. Click a truck tag or corridor card to highlight that path.
              </p>
            </div>
            {selectedTask ? (
              <div className="rounded-[20px] border-3 border-ink bg-[#111827] px-4 py-3 text-paper shadow-panel-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">Focused corridor</div>
                <div className="mt-1 text-sm font-black">
                  {selectedTask.routeStartCity ?? selectedTask.routeStart} to {selectedTask.routeEndCity ?? selectedTask.routeEnd}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <OperationsMap
              actualTrail={replayQuery.data?.timeline}
              expectedPath={selectedTask?.expectedPath}
              routeCheckpoints={selectedTask?.routeCheckpoints}
              fleet={fleetPreview}
              showCheckpoints={settings.showCheckpoints}
              showTelemetryLabels={settings.showTelemetryLabels}
              heightClassName="h-[440px]"
              activeTaskId={selectedTaskId}
              onFleetSelect={setSelectedTaskId}
            />
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {tasks.map((task) => {
              const isSelected = task.id === selectedTaskId;

              return (
                <button
                  key={task.id}
                  className={`rounded-[20px] border-3 border-ink p-3.5 text-left shadow-panel-sm transition ${
                    isSelected ? "bg-[#111827] text-paper" : "bg-white text-ink"
                  }`}
                  onClick={() => setSelectedTaskId(task.id)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-black leading-6">
                        {task.routeStartCity ?? task.routeStart} to {task.routeEndCity ?? task.routeEnd}
                      </div>
                      <div className={`mt-1 text-[12px] leading-5 ${isSelected ? "text-white/70" : "text-ink-muted"}`}>
                        {task.routeStartArea ?? task.routeStart} - {task.routeEndArea ?? task.routeEnd}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill value={task.status} />
                      <StatusPill value={task.riskLevel} />
                    </div>
                  </div>
                  <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
                    <div className={`rounded-[16px] border-3 border-ink p-3 ${isSelected ? "bg-white/10" : "bg-[#f7f1de]"}`}>
                      <div className={`text-xs font-black uppercase tracking-[0.16em] ${isSelected ? "text-white/60" : "text-ink-muted"}`}>
                        Distance and time
                      </div>
                      <div className="mt-2 text-sm font-black">
                        {formatDistance(task.expectedDistanceKm)} / {formatDuration(task.estimatedDuration)}
                      </div>
                    </div>
                    <div className={`rounded-[16px] border-3 border-ink p-3 ${isSelected ? "bg-white/10" : "bg-[#f7f1de]"}`}>
                      <div className={`text-xs font-black uppercase tracking-[0.16em] ${isSelected ? "text-white/60" : "text-ink-muted"}`}>
                        Payload
                      </div>
                      <div className="mt-2 text-sm font-black">
                        {task.loadType ?? "Route payload"} / {task.loadWeightKg?.toLocaleString() ?? 0} kg
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="space-y-5">
          <SettingsPanel
            eyebrow="Dashboard settings"
            title="Tune the command surface"
            description="Persist map, replay, and telemetry preferences for this workstation so live demos stay consistent between sessions."
            onToggle={(key) => toggleSetting(key as keyof typeof adminSettingsDefaults)}
            options={adminSettingsOptions}
            values={settings}
          />
          <AlertFeed alerts={overviewQuery.data?.alerts ?? []} />
        </div>
      </div>
    </div>
  );
};

export default AdminMapPage;
