import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MetricTile } from "@/components/shared/MetricTile";
import { StatusPill } from "@/components/shared/StatusPill";
import { adminSettingsDefaults, formatDistance } from "@/features/admin/admin-config";
import { useAdminRealtimeInvalidation } from "@/features/admin/useAdminRealtimeInvalidation";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { dashboardApi } from "@/services/api/dashboard";
import { taskApi } from "@/services/api/tasks";

const AdminDriversPage = () => {
  const { settings } = useDashboardSettings("route-shield-admin-settings", adminSettingsDefaults);

  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: dashboardApi.admin,
    refetchInterval: 20000,
  });

  const resourcesQuery = useQuery({
    queryKey: ["admin-resources"],
    queryFn: dashboardApi.resources,
    refetchInterval: 15000,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: taskApi.list,
  });

  useAdminRealtimeInvalidation();

  const loading = overviewQuery.isLoading || resourcesQuery.isLoading || tasksQuery.isLoading;
  const drivers = resourcesQuery.data?.drivers ?? [];
  const driverScores = overviewQuery.data?.driverScores ?? [];
  const tasks = tasksQuery.data ?? [];

  const scoreByDriverId = useMemo(
    () => new Map(driverScores.map((entry) => [entry.driverId, entry])),
    [driverScores],
  );

  const truckByDriverId = useMemo(
    () =>
      new Map(
        (resourcesQuery.data?.trucks ?? [])
          .filter((truck) => truck.driverId)
          .map((truck) => [truck.driverId as string, truck]),
      ),
    [resourcesQuery.data?.trucks],
  );

  const taskByDriverId = useMemo(() => {
    const rankedTasks = [...tasks].sort((left, right) => {
      const rank = { IN_PROGRESS: 0, ASSIGNED: 1, DELAYED: 2, COMPLETED: 3, CANCELLED: 4 } as const;
      return rank[left.status] - rank[right.status];
    });

    return new Map(rankedTasks.map((task) => [task.driverId, task]));
  }, [tasks]);

  const driverMetrics = useMemo(() => {
    const averageScore =
      driverScores.length > 0 ? Math.round(driverScores.reduce((sum, entry) => sum + entry.score, 0) / driverScores.length) : 0;

    return [
      {
        label: "Hired drivers",
        value: drivers.length,
        description: "Drivers currently available in the admin resource directory.",
      },
      {
        label: "Average trust score",
        value: averageScore,
        description: "Mean driver score across route adherence, stops, and delay history.",
      },
      {
        label: "Assigned trucks",
        value: resourcesQuery.data?.trucks.filter((truck) => truck.driverId).length ?? 0,
        description: "Fleet units already paired with a registered driver.",
      },
      {
        label: "Flagged drivers",
        value: driverScores.filter((entry) => entry.score < 70).length,
        description: "Drivers currently below the preferred trust-score threshold.",
      },
    ];
  }, [driverScores, drivers.length, resourcesQuery.data?.trucks]);

  if (loading) {
    return <div className="panel-card text-sm text-ink-muted">Loading driver intelligence...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-4">
        {driverMetrics.map((metric) => (
          <MetricTile key={metric.label} description={metric.description} label={metric.label} value={metric.value} />
        ))}
      </div>

      <section className="panel-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Driver directory</div>
            <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Hired drivers and current assignment state</h2>
          </div>
          <div className="rounded-[16px] border-3 border-ink bg-accent-yellow px-3.5 py-2.5 text-sm font-black text-ink shadow-panel-sm">
            {drivers.length} profiles synced from auth and admin resources
          </div>
        </div>

        <div className="mt-4.5 grid gap-3 xl:grid-cols-2">
          {drivers.map((driver) => {
            const scoreEntry = scoreByDriverId.get(driver.id);
            const activeTask = taskByDriverId.get(driver.id);
            const assignedTruck = truckByDriverId.get(driver.id);

            return (
              <article key={driver.id} className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[1rem] font-black text-ink">{driver.name}</div>
                    <div className="text-sm text-ink-muted">{driver.email}</div>
                  </div>
                  <div className="rounded-[16px] border-3 border-ink bg-[#111827] px-3.5 py-2.5 text-paper shadow-panel-sm">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">Trust score</div>
                    <div className="mt-1 text-[1rem] font-black">{scoreEntry?.score ?? 0}</div>
                  </div>
                </div>

                <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
                  <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Assigned truck</div>
                    <div className="mt-2 text-sm font-black text-ink">{assignedTruck?.truckNumber ?? "Awaiting truck"}</div>
                    <div className="text-sm text-ink-muted">{assignedTruck?.model ?? "Not yet assigned"}</div>
                  </div>
                  <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Current route</div>
                    <div className="mt-2 text-sm font-black text-ink">
                      {activeTask ? `${activeTask.routeStartCity ?? activeTask.routeStart} to ${activeTask.routeEndCity ?? activeTask.routeEnd}` : "No live route"}
                    </div>
                    <div className="text-sm text-ink-muted">{activeTask?.manifestCode ?? "No active manifest"}</div>
                  </div>
                  <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Distance and load</div>
                    <div className="mt-2 text-sm font-black text-ink">
                      {activeTask ? formatDistance(activeTask.expectedDistanceKm) : "No distance plan"}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {activeTask ? `${activeTask.loadWeightKg?.toLocaleString() ?? 0} kg / ${activeTask.loadUnits ?? 0} units` : "No active payload"}
                    </div>
                  </div>
                  <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Trip posture</div>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill value={activeTask?.status ?? "ASSIGNED"} />
                      <StatusPill value={activeTask?.riskLevel ?? "LOW"} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel-card">
        <div className="eyebrow">Driver trust board</div>
        <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Performance and last corridor snapshot</h2>
        <div className="mt-4.5 space-y-2.5">
          {driverScores.map((entry) => (
            <div key={entry.id} className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-black text-ink">{entry.name}</div>
                  <div className="text-sm text-ink-muted">{entry.email}</div>
                </div>
                <div className="text-[1.5rem] font-black tracking-[-0.04em] text-ink">{entry.score}</div>
              </div>
              <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 text-sm font-bold text-ink">
                  {String(entry.metrics?.lastRoute ?? "No recent route")}
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 text-sm font-bold text-ink">
                  {Number(entry.metrics?.expectedDistanceKm ?? 0).toFixed(0)} km
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 text-sm font-bold text-ink">
                  {Number(entry.metrics?.loadWeightKg ?? 0).toLocaleString()} kg
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Fleet board</div>
            <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Trucks, payload, and route posture</h2>
          </div>
          <div className="rounded-[16px] border-3 border-ink bg-accent-yellow px-3.5 py-2.5 text-sm font-black text-ink shadow-panel-sm">
            {overviewQuery.data?.fleet.length ?? 0} trucks in active monitoring
          </div>
        </div>

        <div className={`mt-4.5 grid gap-3 ${settings.denseFleetBoard ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
          {overviewQuery.data?.fleet.map((truck) => (
            <article key={truck.truckId} className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[1rem] font-black text-ink">{truck.truckNumber}</div>
                  <div className="text-sm text-ink-muted">
                    {truck.model ?? "Fleet truck"} / {truck.homeBase ?? "South India yard"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill value={truck.taskStatus} />
                  <StatusPill value={truck.riskLevel} />
                </div>
              </div>

              <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Driver</div>
                  <div className="mt-2 text-sm font-black text-ink">{truck.driverName ?? "Unassigned"}</div>
                  <div className="text-sm text-ink-muted">{truck.capacityKg?.toLocaleString() ?? 0} kg capacity</div>
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Payload</div>
                  <div className="mt-2 text-sm font-black text-ink">{truck.loadType ?? "Awaiting assignment"}</div>
                  <div className="text-sm text-ink-muted">{truck.loadWeightKg?.toLocaleString() ?? 0} kg active load</div>
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Distance</div>
                  <div className="mt-2 text-sm font-black text-ink">{formatDistance(truck.expectedDistanceKm)}</div>
                  <div className="text-sm text-ink-muted">{truck.status.replace("_", " ")}</div>
                </div>
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Current route</div>
                  <div className="mt-2 text-sm font-black text-ink">{truck.routeStart ?? "No route"}</div>
                  <div className="text-sm text-ink-muted">{truck.routeEnd ?? "Standby"}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDriversPage;
