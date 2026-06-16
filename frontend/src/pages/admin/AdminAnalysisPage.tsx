import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertFeed } from "@/components/admin/AlertFeed";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { MetricTile } from "@/components/shared/MetricTile";
import { useAdminRealtimeInvalidation } from "@/features/admin/useAdminRealtimeInvalidation";
import { dashboardApi } from "@/services/api/dashboard";

const AdminAnalysisPage = () => {
  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: dashboardApi.admin,
    refetchInterval: 20000,
  });

  useAdminRealtimeInvalidation();

  const loading = overviewQuery.isLoading;
  const analytics = overviewQuery.data?.analytics;
  const series = analytics?.series ?? [];

  const analysisHighlights = useMemo(() => {
    const averageCompliance =
      series.length > 0 ? `${Math.round(series.reduce((sum, item) => sum + item.avgCompliance, 0) / series.length)}%` : "0%";

    const anomalyLeader = Object.entries(analytics?.anomalyByType ?? {}).sort((left, right) => right[1] - left[1])[0];
    const criticalAlerts = (overviewQuery.data?.alerts ?? []).filter((alert) => alert.severity === "CRITICAL").length;

    return [
      {
        label: "Average compliance",
        value: averageCompliance,
        description: "Mean compliance across the current weekly analytics window.",
      },
      {
        label: "Top anomaly",
        value: anomalyLeader ? anomalyLeader[0].replaceAll("_", " ") : "None",
        description: anomalyLeader ? `${anomalyLeader[1]} logged events in the current seeded dataset.` : "No anomaly records found.",
      },
      {
        label: "Critical alerts",
        value: criticalAlerts,
        description: "Unresolved severe exceptions requiring admin intervention.",
      },
    ];
  }, [analytics?.anomalyByType, overviewQuery.data?.alerts, series]);

  if (loading) {
    return <div className="panel-card text-sm text-ink-muted">Loading analysis workspace...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-5">
        {(overviewQuery.data?.metricCards ?? []).map((metric) => (
          <MetricTile key={metric.label} description={metric.trend} label={metric.label} value={metric.value} />
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {analysisHighlights.map((metric) => (
          <MetricTile key={metric.label} description={metric.description} label={metric.label} value={metric.value} />
        ))}
      </div>

      <AnalyticsCharts analytics={overviewQuery.data?.analytics ?? { anomalyByType: {}, series: [] }} />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <AlertFeed alerts={overviewQuery.data?.alerts ?? []} />

        <section className="panel-card">
          <div className="eyebrow">Weekly narrative</div>
          <h2 className="mt-2 text-[1.08rem] font-black tracking-[-0.04em] text-ink lg:text-[1.24rem]">How the operation is trending</h2>
          <div className="mt-4.5 space-y-2.5">
            {series.map((entry) => (
              <div key={entry.label} className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-black text-ink">{entry.label}</div>
                    <div className="mt-1.5 text-sm text-ink-muted">
                      {entry.trips} trips monitored with {entry.anomalies} anomaly events recorded.
                    </div>
                  </div>
                  <div className="rounded-[16px] border-3 border-ink bg-accent-blue px-3.5 py-2.5 text-sm font-black text-paper shadow-panel-sm">
                    {Math.round(entry.avgCompliance)}% compliance
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminAnalysisPage;
