import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { TripReplayPanel } from "@/components/admin/TripReplayPanel";
import { MetricTile } from "@/components/shared/MetricTile";
import { StatusPill } from "@/components/shared/StatusPill";
import { adminSettingsDefaults, formatDistance, formatDuration } from "@/features/admin/admin-config";
import { useAdminRealtimeInvalidation } from "@/features/admin/useAdminRealtimeInvalidation";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { taskApi } from "@/services/api/tasks";

const AdminReplayPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("task");
  const { settings } = useDashboardSettings("route-shield-admin-settings", adminSettingsDefaults);

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
      setSearchParams({ task: firstTask.id }, { replace: true });
    }
  }, [selectedTaskId, setSearchParams, tasksQuery.data]);

  const tasks = tasksQuery.data ?? [];
  const loading = tasksQuery.isLoading;

  const replayMetrics = useMemo(() => {
    const replay = replayQuery.data;

    return [
      {
        label: "Replay trail",
        value: replay?.timeline.length ?? 0,
        description: "Captured telemetry points available for timeline playback.",
      },
      {
        label: "Anomalies",
        value: replay?.anomalies.length ?? 0,
        description: "Logged fraud or compliance exceptions attached to the selected trip.",
      },
      {
        label: "Stop proofs",
        value: replay?.stops.length ?? 0,
        description: "Driver stop-justification records available for inspection.",
      },
      {
        label: "Route length",
        value: formatDistance(replay?.task.expectedDistanceKm),
        description: "Expected trip corridor distance for the selected replay.",
      },
    ];
  }, [replayQuery.data]);

  if (loading) {
    return <div className="panel-card text-sm text-ink-muted">Loading replay board...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        {replayMetrics.map((metric) => (
          <MetricTile key={metric.label} description={metric.description} label={metric.label} value={metric.value} />
        ))}
      </div>

      <section className="panel-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Replay roster</div>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-ink lg:text-[1.55rem]">Choose the trip to inspect</h2>
          </div>
          <div className="rounded-[18px] border-3 border-ink bg-accent-yellow px-4 py-3 text-sm font-black text-ink shadow-panel-sm">
            {tasks.length} trips available for playback
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => {
            const isSelected = task.id === selectedTaskId;

            return (
              <button
                key={task.id}
                className={`rounded-[22px] border-3 border-ink p-4 text-left shadow-panel-sm transition ${
                  isSelected ? "bg-[#111827] text-paper" : "bg-white text-ink"
                }`}
                onClick={() => setSearchParams({ task: task.id })}
                type="button"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-black">
                      {task.routeStartCity ?? task.routeStart} to {task.routeEndCity ?? task.routeEnd}
                    </div>
                    <div className={`mt-1 text-sm ${isSelected ? "text-white/70" : "text-ink-muted"}`}>
                      {task.routeStartArea ?? task.routeStart} - {task.routeEndArea ?? task.routeEnd}
                    </div>
                    <div className={`mt-2 text-sm ${isSelected ? "text-white/70" : "text-ink-muted"}`}>
                      {task.driver?.name} - {task.truck?.truckNumber} - {task.truck?.model ?? "Fleet truck"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill value={task.status} />
                    <StatusPill value={task.riskLevel} />
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className={`rounded-[18px] border-3 border-ink p-3 ${isSelected ? "bg-white/10" : "bg-[#f7f1de]"}`}>
                    <div className={`text-xs font-black uppercase tracking-[0.16em] ${isSelected ? "text-white/60" : "text-ink-muted"}`}>
                      Route plan
                    </div>
                    <div className="mt-2 text-sm font-black">
                      {formatDistance(task.expectedDistanceKm)} / {formatDuration(task.estimatedDuration)}
                    </div>
                  </div>
                  <div className={`rounded-[18px] border-3 border-ink p-3 ${isSelected ? "bg-white/10" : "bg-[#f7f1de]"}`}>
                    <div className={`text-xs font-black uppercase tracking-[0.16em] ${isSelected ? "text-white/60" : "text-ink-muted"}`}>
                      Payload
                    </div>
                    <div className="mt-2 text-sm font-black">
                      {task.loadType ?? "Route payload"} / {task.loadWeightKg?.toLocaleString() ?? 0} kg
                    </div>
                  </div>
                  <div className={`rounded-[18px] border-3 border-ink p-3 ${isSelected ? "bg-white/10" : "bg-[#f7f1de]"}`}>
                    <div className={`text-xs font-black uppercase tracking-[0.16em] ${isSelected ? "text-white/60" : "text-ink-muted"}`}>
                      Open replay
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 text-sm font-black">
                      Playback selected
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <TripReplayPanel
        replay={replayQuery.data ?? null}
        autoPlayDefault={settings.autoReplay}
        showCheckpoints={settings.showCheckpoints}
        showTelemetryLabels={settings.showTelemetryLabels}
      />
    </div>
  );
};

export default AdminReplayPage;
