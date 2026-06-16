import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdminOverview } from "@/types/domain";

const palette = ["#1a73e8", "#34a853", "#fbbc05", "#ea4335", "#111827"];

export const AnalyticsCharts = ({ analytics }: { analytics: AdminOverview["analytics"] }) => {
  const anomalyRows = Object.entries(analytics.anomalyByType).map(([type, value]) => ({ type, value }));

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
      <section className="panel-card">
        <div className="eyebrow">Weekly pulse</div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink">Trips vs anomaly load</h2>
        <div className="mt-6 h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.series}>
              <CartesianGrid strokeDasharray="6 6" stroke="#11182720" />
              <XAxis dataKey="label" stroke="#4b5563" />
              <YAxis stroke="#4b5563" />
              <Tooltip />
              <Line type="monotone" dataKey="trips" stroke="#1a73e8" strokeWidth={4} />
              <Line type="monotone" dataKey="anomalies" stroke="#ea4335" strokeWidth={4} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel-card">
        <div className="eyebrow">Fraud taxonomy</div>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-ink">Anomaly mix</h2>
        <div className="mt-6 h-[290px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={anomalyRows}>
              <CartesianGrid strokeDasharray="6 6" stroke="#11182720" />
              <XAxis dataKey="type" stroke="#4b5563" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4b5563" />
              <Tooltip />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {anomalyRows.map((entry, index) => (
                  <Cell key={entry.type} fill={palette[index % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
