import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import { OperationsMap } from "@/components/maps/OperationsMap";
import { StatusPill } from "@/components/shared/StatusPill";
import { DriverNotificationModal } from "./DriverNotificationModal";
import type { TripReplay } from "@/types/domain";

const formatDuration = (minutes?: number | null) => {
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

export const TripReplayPanel = ({
  replay,
  autoPlayDefault = false,
  showCheckpoints = true,
  showTelemetryLabels = true,
}: {
  replay: TripReplay | null;
  autoPlayDefault?: boolean;
  showCheckpoints?: boolean;
  showTelemetryLabels?: boolean;
}) => {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notifyAnomalyId, setNotifyAnomalyId] = useState<string | null>(null);

  useEffect(() => {
    setIndex(0);
    setIsPlaying(Boolean(autoPlayDefault && replay?.timeline.length));
  }, [autoPlayDefault, replay?.task.id, replay?.timeline.length]);

  useEffect(() => {
    if (!isPlaying || !replay || replay.timeline.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setIndex((previous) => {
        if (previous >= replay.timeline.length - 1) {
          setIsPlaying(false);
          return previous;
        }

        return previous + 1;
      });
    }, 800);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPlaying, replay]);

  const current = replay?.timeline[index] ?? replay?.timeline[0];
  const progress = useMemo(() => {
    if (!replay || replay.timeline.length <= 1) {
      return 0;
    }

    return Math.round((index / (replay.timeline.length - 1)) * 100);
  }, [index, replay]);

  if (!replay) {
    return (
      <section className="panel-card">
        <div className="eyebrow">Trip replay</div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink">Select a trip to replay</h2>
      </section>
    );
  }

  return (
    <section className="panel-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="eyebrow">Trip replay</div>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink">
            {replay.task.routeStartCity ?? replay.task.routeStart} to {replay.task.routeEndCity ?? replay.task.routeEnd}
          </h2>
          <p className="mt-3 text-sm text-ink-muted">
            {replay.task.routeStartArea ?? replay.task.routeStart} to {replay.task.routeEndArea ?? replay.task.routeEnd}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill value={replay.task.riskLevel} />
          <StatusPill value={replay.task.status} />
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <OperationsMap
          expectedPath={replay.task.expectedPath}
          routeCheckpoints={replay.task.routeCheckpoints}
          actualTrail={replay.timeline}
          focusedIndex={index}
          showCheckpoints={showCheckpoints}
          showTelemetryLabels={showTelemetryLabels}
          heightClassName="h-[360px]"
        />

        <div className="space-y-3.5">
          <div className="rounded-[22px] border-3 border-ink bg-white p-4 shadow-panel-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Timeline cursor</div>
                <div className="mt-2 text-sm font-bold text-ink">
                  {current ? new Date(current.timestamp).toLocaleString() : "No trail data"}
                </div>
              </div>
              <button className="neo-button bg-accent-blue text-paper" onClick={() => setIsPlaying((value) => !value)} type="button">
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>

            <input
              className="mt-5 w-full accent-[#1a73e8]"
              type="range"
              min={0}
              max={Math.max(replay.timeline.length - 1, 0)}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
            />

            <div className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-ink-muted">{progress}% of seeded playback</div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Waypoint</div>
                <div className="mt-1.5 text-base font-black leading-6 text-ink">{current?.areaName ?? "No location yet"}</div>
                <div className="text-sm text-ink-muted">{current?.cityName ?? "Telemetry pending"}</div>
              </div>
              <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Motion</div>
                <div className="mt-1.5 text-base font-black text-ink">
                  {current?.speedKph ? `${Math.round(current.speedKph)} km/h` : "Stopped"}
                </div>
                <div className="text-sm text-ink-muted">
                  {current?.odometerKm ? `${current.odometerKm.toFixed(0)} km captured` : "Distance pending"}
                </div>
              </div>
              <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Payload</div>
                <div className="mt-1.5 text-base font-black leading-6 text-ink">{replay.task.loadType ?? "Route payload"}</div>
                <div className="text-sm text-ink-muted">
                  {replay.task.loadWeightKg?.toLocaleString() ?? 0} kg / {replay.task.loadUnits ?? 0} units
                </div>
              </div>
              <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-ink-muted">Distance and time</div>
                <div className="mt-1.5 text-base font-black text-ink">
                  {Number(replay.task.actualDistanceKm ?? replay.task.expectedDistanceKm ?? 0).toFixed(0)} km
                </div>
                <div className="text-sm text-ink-muted">{formatDuration(replay.task.estimatedDuration)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border-3 border-ink bg-white p-4 shadow-panel-sm">
            <div className="eyebrow">Compliance notes</div>
            <div className="mt-3.5 space-y-2.5">
              {replay.anomalies.slice(0, 4).map((anomaly) => (
                <div key={anomaly.id} className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-ink">{anomaly.type}</div>
                    <StatusPill value={anomaly.severity} />
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">{anomaly.message}</p>
                  <div className="mt-3 flex justify-end">
                    <button 
                      className="rounded-full bg-accent-blue px-3 py-1 text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      onClick={() => setNotifyAnomalyId(anomaly.id)}
                      type="button"
                    >
                      Notify Driver
                    </button>
                  </div>
                </div>
              ))}
              {replay.anomalies.length === 0 ? (
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5 text-sm text-ink-muted">
                  No anomaly records were attached to this trip.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[22px] border-3 border-ink bg-white p-4 shadow-panel-sm">
            <div className="eyebrow">Stop justifications</div>
            <div className="mt-3.5 space-y-2.5">
              {replay.stops.slice(0, 3).map((stop) => (
                <div key={stop.id} className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                  <div className="text-sm font-black text-ink">{stop.reason}</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-sm text-ink-muted">{new Date(stop.timestamp).toLocaleString()}</div>
                    {stop.imageUrl ? (
                      <a
                        href={stop.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white hover:opacity-80 transition-opacity"
                      >
                        See photo
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
              {replay.stops.length === 0 ? (
                <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5 text-sm text-ink-muted">
                  No stop justification was recorded for this trip.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      
      <DriverNotificationModal
        tripId={replay.task.id}
        driverId={replay.task.driverId}
        anomalyId={notifyAnomalyId || ""}
        open={!!notifyAnomalyId}
        onClose={() => setNotifyAnomalyId(null)}
      />
    </section>
  );
};
