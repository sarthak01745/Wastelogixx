import { formatDistanceToNowStrict } from "date-fns";
import { StatusPill } from "@/components/shared/StatusPill";
import type { AdminOverview } from "@/types/domain";

export const AlertFeed = ({ alerts }: { alerts: AdminOverview["alerts"] }) => {
  return (
    <section className="panel-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Anomaly alerts</div>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink">Live compliance feed</h2>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="rounded-[22px] border-3 border-ink bg-white p-4 shadow-panel-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black text-ink">{alert.title}</div>
                <p className="mt-2 text-sm text-ink-muted">{alert.message}</p>
              </div>
              <StatusPill value={alert.severity} />
            </div>
            <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
              {alert.driverName ?? "No driver"} · {formatDistanceToNowStrict(new Date(alert.createdAt), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
