import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPinned, Plus, Route } from "lucide-react";
import { toast } from "sonner";
import { OperationsMap } from "@/components/maps/OperationsMap";
import { MetricTile } from "@/components/shared/MetricTile";
import { createTaskFormDefaults, formatDuration } from "@/features/admin/admin-config";
import { dashboardApi } from "@/services/api/dashboard";
import { taskApi } from "@/services/api/tasks";
import type { RoutePlan } from "@/types/domain";

const AdminTasksPage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => createTaskFormDefaults());
  const [routeQueries, setRouteQueries] = useState({
    originQuery: "Ariyamangalam Transfer Station, Tiruchirappalli",
    destinationQuery: "Kodungaiyur Material Recovery Hub, Chennai",
  });
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);

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

  useEffect(() => {
    const driver = resourcesQuery.data?.drivers[0];
    const truck = resourcesQuery.data?.trucks[0];

    if (driver && truck && !form.driverId && !form.truckId) {
      setForm((value) => ({ ...value, driverId: driver.id, truckId: truck.id }));
    }
  }, [form.driverId, form.truckId, resourcesQuery.data]);

  const planRouteMutation = useMutation({
    mutationFn: () => taskApi.planRoute(routeQueries),
    onSuccess: (plan) => {
      setRoutePlan(plan);
      setForm((value) => ({
        ...value,
        routeStart: plan.routeStart,
        routeEnd: plan.routeEnd,
        routeStartCity: plan.routeStartCity,
        routeStartArea: plan.routeStartArea,
        routeEndCity: plan.routeEndCity,
        routeEndArea: plan.routeEndArea,
        expectedDistanceKm: String(plan.expectedDistanceKm),
        estimatedDuration: String(plan.estimatedDuration),
        routeCheckpoints: JSON.stringify(plan.routeCheckpoints),
        expectedPath: JSON.stringify(plan.expectedPath),
      }));
      toast.success("Route data fetched from maps and cached for reuse.");
    },
    onError: () => {
      toast.error("Could not build that route from maps. Check the place names and try again.");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!form.expectedPath || !form.routeCheckpoints) {
        throw new Error("Route plan missing");
      }

      return taskApi.create({
        driverId: form.driverId,
        truckId: form.truckId,
        routeStart: form.routeStart,
        routeEnd: form.routeEnd,
        routeStartCity: form.routeStartCity,
        routeStartArea: form.routeStartArea,
        routeEndCity: form.routeEndCity,
        routeEndArea: form.routeEndArea,
        scheduledTime: new Date(form.scheduledTime).toISOString(),
        deadline: new Date(form.deadline).toISOString(),
        paymentAmount: Number(form.paymentAmount),
        expectedDistanceKm: Number(form.expectedDistanceKm),
        estimatedDuration: Number(form.estimatedDuration),
        loadType: form.loadType,
        loadWeightKg: Number(form.loadWeightKg),
        loadUnits: Number(form.loadUnits),
        manifestCode: form.manifestCode,
        routeCheckpoints: JSON.parse(form.routeCheckpoints),
        expectedPath: JSON.parse(form.expectedPath),
      });
    },
    onSuccess: () => {
      toast.success("Trip assigned successfully.");
      setForm((current) => ({
        ...createTaskFormDefaults(),
        driverId: current.driverId,
        truckId: current.truckId,
      }));
      setRoutePlan(null);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => {
      toast.error("Build the route plan first, then assign the trip.");
    },
  });

  const loading = resourcesQuery.isLoading || tasksQuery.isLoading || overviewQuery.isLoading;

  const assignmentMetrics = useMemo(
    () => [
      {
        label: "Drivers ready",
        value: resourcesQuery.data?.drivers.length ?? 0,
        description: "Hired drivers available to receive a new corridor assignment.",
      },
      {
        label: "Trucks ready",
        value: resourcesQuery.data?.trucks.length ?? 0,
        description: "Fleet units currently available in the dispatch resource board.",
      },
      {
        label: "Queued trips",
        value: tasksQuery.data?.length ?? 0,
        description: "Assignments already created and waiting in the roster view.",
      },
      {
        label: "Planned payout",
        value: `Rs ${Number(form.paymentAmount || 0).toLocaleString("en-IN")}`,
        description: "Current payout for the trip being prepared on this form.",
      },
    ],
    [form.paymentAmount, resourcesQuery.data?.drivers.length, resourcesQuery.data?.trucks.length, tasksQuery.data?.length],
  );

  if (loading) {
    return <div className="panel-card text-sm text-ink-muted">Loading assignment studio...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-4">
        {assignmentMetrics.map((metric) => (
          <MetricTile key={metric.label} description={metric.description} label={metric.label} value={metric.value} />
        ))}
      </div>

      <section className="panel-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Route planner</div>
            <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.24rem]">Type place names, then auto-build the corridor</h2>
            <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-ink-muted">
              WasteLogix now pulls route geometry and checkpoint data from maps, then caches the place and route plan in the database so repeated planning stays fast and cheaper.
            </p>
          </div>
          <button className="neo-button bg-accent-yellow text-ink" onClick={() => planRouteMutation.mutate()} type="button">
            {planRouteMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Route size={15} />}
            Build route
          </button>
        </div>

        <div className="mt-4.5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <label className="auth-field">
              <span>Origin place name</span>
              <input
                placeholder="Example: Ariyamangalam Transfer Station, Tiruchirappalli"
                value={routeQueries.originQuery}
                onChange={(event) => setRouteQueries((value) => ({ ...value, originQuery: event.target.value }))}
              />
            </label>
            <label className="auth-field">
              <span>Destination place name</span>
              <input
                placeholder="Example: Kodungaiyur Material Recovery Hub, Chennai"
                value={routeQueries.destinationQuery}
                onChange={(event) => setRouteQueries((value) => ({ ...value, destinationQuery: event.target.value }))}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border-3 border-ink bg-white p-3 shadow-panel-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Origin auto-fill</div>
                <div className="mt-2 text-sm font-black text-ink">{form.routeStartCity || "Waiting for place lookup"}</div>
                <div className="text-sm text-ink-muted">{form.routeStartArea || "Area will be fetched from maps"}</div>
              </div>
              <div className="rounded-[16px] border-3 border-ink bg-white p-3 shadow-panel-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Destination auto-fill</div>
                <div className="mt-2 text-sm font-black text-ink">{form.routeEndCity || "Waiting for place lookup"}</div>
                <div className="text-sm text-ink-muted">{form.routeEndArea || "Area will be fetched from maps"}</div>
              </div>
              <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 shadow-panel-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Distance</div>
                <div className="mt-2 text-sm font-black text-ink">{form.expectedDistanceKm ? `${form.expectedDistanceKm} km` : "Pending route build"}</div>
              </div>
              <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 shadow-panel-sm">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">ETA</div>
                <div className="mt-2 text-sm font-black text-ink">
                  {form.estimatedDuration ? formatDuration(Number(form.estimatedDuration)) : "Pending route build"}
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border-3 border-ink bg-white p-3 shadow-panel-sm">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Stored route summary</div>
              <div className="mt-2 text-sm font-black text-ink">{form.routeStart || "Origin will appear here after route planning."}</div>
              <div className="mt-1 text-sm text-ink-muted">{form.routeEnd || "Destination will appear here after route planning."}</div>
            </div>
          </div>

          <div>
            <OperationsMap
              expectedPath={routePlan?.expectedPath ?? null}
              routeCheckpoints={routePlan?.routeCheckpoints ?? null}
              showCheckpoints
              showTelemetryLabels={false}
              heightClassName="h-[360px]"
            />
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Dispatch brief</div>
            <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.24rem]">Finalize truck, schedule, and load details</h2>
          </div>
          <button className="neo-button bg-accent-blue text-paper" onClick={() => createTaskMutation.mutate()} type="button">
            {createTaskMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Plus size={15} />}
            Assign trip
          </button>
        </div>

        <div className="mt-4.5 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          <label className="auth-field">
            <span>Driver</span>
            <select value={form.driverId} onChange={(event) => setForm((value) => ({ ...value, driverId: event.target.value }))}>
              <option value="">Select driver</option>
              {resourcesQuery.data?.drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.email}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            <span>Truck</span>
            <select value={form.truckId} onChange={(event) => setForm((value) => ({ ...value, truckId: event.target.value }))}>
              <option value="">Select truck</option>
              {resourcesQuery.data?.trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.truckNumber} - {truck.model ?? truck.status}
                </option>
              ))}
            </select>
          </label>
          <label className="auth-field">
            <span>Scheduled</span>
            <input type="datetime-local" value={form.scheduledTime} onChange={(event) => setForm((value) => ({ ...value, scheduledTime: event.target.value }))} />
          </label>
          <label className="auth-field">
            <span>Deadline</span>
            <input type="datetime-local" value={form.deadline} onChange={(event) => setForm((value) => ({ ...value, deadline: event.target.value }))} />
          </label>
          <label className="auth-field">
            <span>Payment</span>
            <input value={form.paymentAmount} onChange={(event) => setForm((value) => ({ ...value, paymentAmount: event.target.value }))} />
          </label>
          <label className="auth-field">
            <span>Manifest code</span>
            <input value={form.manifestCode} onChange={(event) => setForm((value) => ({ ...value, manifestCode: event.target.value }))} />
          </label>
          <label className="auth-field">
            <span>Load type</span>
            <input value={form.loadType} onChange={(event) => setForm((value) => ({ ...value, loadType: event.target.value }))} />
          </label>
          <label className="auth-field">
            <span>Load weight kg</span>
            <input value={form.loadWeightKg} onChange={(event) => setForm((value) => ({ ...value, loadWeightKg: event.target.value }))} />
          </label>
          <label className="auth-field">
            <span>Load units</span>
            <input value={form.loadUnits} onChange={(event) => setForm((value) => ({ ...value, loadUnits: event.target.value }))} />
          </label>
          <div className="rounded-[16px] border-3 border-ink bg-white p-3 shadow-panel-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Route source</div>
            <div className="mt-2 text-sm font-black text-ink">{routePlan ? "Fetched and cached from maps" : "Build route to auto-fill"}</div>
            <div className="mt-1 text-sm text-ink-muted">
              {routePlan ? `${routePlan.routeCheckpoints.length} checkpoints stored for reuse` : "No route has been generated yet."}
            </div>
          </div>
          <div className="rounded-[16px] border-3 border-ink bg-white p-3 shadow-panel-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">Start checkpoint</div>
            <div className="mt-2 text-sm font-black text-ink">{form.routeStartArea || "Pending"}</div>
            <div className="mt-1 text-sm text-ink-muted">{form.routeStartCity || "Waiting for lookup"}</div>
          </div>
          <div className="rounded-[16px] border-3 border-ink bg-white p-3 shadow-panel-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-muted">End checkpoint</div>
            <div className="mt-2 text-sm font-black text-ink">{form.routeEndArea || "Pending"}</div>
            <div className="mt-1 text-sm text-ink-muted">{form.routeEndCity || "Waiting for lookup"}</div>
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border-3 border-dashed border-black/20 bg-[#f7f1de] px-4 py-3 text-sm text-ink-muted">
          The raw checkpoint JSON and path GeoJSON are now stored behind the scenes after route planning, so dispatch staff only need place names instead of manual coordinate editing.
        </div>
      </section>
    </div>
  );
};

export default AdminTasksPage;
