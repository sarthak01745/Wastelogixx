import { DriverMetricsGrid } from "@/components/driver/DriverMetricsGrid";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatDriverDuration } from "@/features/driver/driver-config";
import { useDriverLayout } from "./DriverLayout";

const DriverTripsPage = () => {
  const { dashboardData, currentTrip, locationSync } = useDriverLayout();

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
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="panel-card">
          <div className="eyebrow">Current assignment</div>
          <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">What is on your board right now</h2>
          <div className="mt-4.5 space-y-2.5">
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Route</div>
              <div className="mt-3 text-lg font-black text-ink">
                {currentTrip
                  ? `${currentTrip.routeStartCity ?? currentTrip.routeStart} to ${currentTrip.routeEndCity ?? currentTrip.routeEnd}`
                  : "No live assignment"}
              </div>
              <div className="mt-2 text-sm text-ink-muted">
                {currentTrip ? `${currentTrip.routeStartArea ?? currentTrip.routeStart} - ${currentTrip.routeEndArea ?? currentTrip.routeEnd}` : "Awaiting next dispatch"}
              </div>
            </div>
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Trip posture</div>
              <div className="mt-3 flex items-center gap-2">
                <StatusPill value={currentTrip?.status} />
                <StatusPill value={currentTrip?.riskLevel} />
              </div>
              <div className="mt-3 text-sm text-ink-muted">{currentTrip?.manifestCode ?? "Manifest pending"}</div>
            </div>
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Offline sync queue</div>
              <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-ink">{locationSync.pendingCount}</div>
              <div className="mt-2 text-sm text-ink-muted">
                {locationSync.isSyncing ? "Syncing cached logs..." : "Cached location points will upload when the connection is back."}
              </div>
            </div>
          </div>
        </section>

        <section className="panel-card">
          <div className="eyebrow">Upcoming trips</div>
          <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Queued assignments</h2>
          <div className="mt-4.5 space-y-2.5">
            {dashboardData.upcomingTrips.map((trip) => (
              <div key={trip.id} className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-black text-ink">
                      {trip.routeStartCity ?? trip.routeStart} to {trip.routeEndCity ?? trip.routeEnd}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {trip.routeStartArea ?? trip.routeStart} - {trip.routeEndArea ?? trip.routeEnd}
                    </div>
                  </div>
                  <StatusPill value={trip.status} />
                </div>
                <div className="mt-3.5 grid gap-2.5 md:grid-cols-2">
                  <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 text-sm font-bold text-ink">
                    {Number(trip.expectedDistanceKm ?? 0).toFixed(0)} km / {formatDriverDuration(trip.estimatedDuration)}
                  </div>
                  <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3 text-sm font-bold text-ink">
                    {trip.loadType ?? "Load pending"} / {trip.loadWeightKg?.toLocaleString() ?? 0} kg
                  </div>
                </div>
                <div className="mt-3 text-sm text-ink-muted">
                  Scheduled: {new Date(trip.scheduledTime).toLocaleString()} / {trip.truck?.truckNumber ?? "No truck"}
                </div>
              </div>
            ))}
            {dashboardData.upcomingTrips.length === 0 ? (
              <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm text-sm text-ink-muted">
                No upcoming trips are queued right now.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DriverTripsPage;
