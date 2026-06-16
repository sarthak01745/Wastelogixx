import { buildDriverMetricCards } from "@/features/driver/driver-config";
import type { DriverOverview } from "@/types/domain";
import { MetricTile } from "@/components/shared/MetricTile";

export const DriverMetricsGrid = ({ overview }: { overview?: DriverOverview | null }) => (
  <div className="grid gap-3 xl:grid-cols-4">
    {buildDriverMetricCards(overview).map((metric) => (
      <MetricTile key={metric.label} description={metric.description} label={metric.label} value={metric.value} />
    ))}
  </div>
);
