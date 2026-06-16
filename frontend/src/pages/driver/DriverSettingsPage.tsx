import { Camera } from "lucide-react";
import { DriverMetricsGrid } from "@/components/driver/DriverMetricsGrid";
import { SettingsPanel } from "@/components/shared/SettingsPanel";
import { driverSettingsDefaults, driverSettingsOptions } from "@/features/driver/driver-config";
import { useDriverLayout } from "./DriverLayout";

const DriverSettingsPage = () => {
  const { dashboardData, currentTrip, settings, toggleSetting, locationSync } = useDriverLayout();

  return (
    <div className="space-y-5">
      <DriverMetricsGrid overview={dashboardData} />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SettingsPanel
          eyebrow="Driver settings"
          title="Tune your route console"
          description="Adjust how route guidance, checkpoint overlays, and proof-capture help appear on this driver workstation."
          options={driverSettingsOptions}
          values={settings}
          onToggle={(key) => toggleSetting(key as keyof typeof driverSettingsDefaults)}
        />

        <section className="panel-card">
          <div className="eyebrow">Workspace status</div>
          <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em] text-ink lg:text-[1.22rem]">Compliance tools and alerts</h2>
          <div className="mt-4.5 space-y-2.5">
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Offline sync queue</div>
              <div className="mt-3 text-3xl font-black tracking-[-0.05em] text-ink">{locationSync.pendingCount}</div>
              <div className="mt-2 text-sm text-ink-muted">
                {locationSync.isSyncing ? "Syncing cached logs..." : "Cached location points will upload when the connection is back."}
              </div>
            </div>
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Current manifest</div>
              <div className="mt-3 text-lg font-black text-ink">{currentTrip?.manifestCode ?? "No active manifest"}</div>
              <div className="mt-2 text-sm text-ink-muted">
                {currentTrip?.loadType ?? "Waiting for next assignment"} / {currentTrip?.truck?.truckNumber ?? "No truck assigned"}
              </div>
            </div>
            {settings.cameraHints ? (
              <div className="rounded-[20px] border-3 border-ink bg-[#f7f1de] p-3.5 shadow-panel-sm">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-ink">
                  <Camera size={16} />
                  Camera workflow
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  When a stop prompt appears, use the live camera and capture the truck, number plate, and immediate surroundings in one frame before submitting the reason.
                </p>
              </div>
            ) : null}
            <div className="rounded-[20px] border-3 border-ink bg-white p-3.5 shadow-panel-sm">
              <div className="text-sm font-black text-ink">Driver alerts</div>
              <div className="mt-3.5 space-y-2.5">
                {dashboardData.alerts.map((alert) => (
                  <div key={alert.id} className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5">
                    <div className="text-sm font-black text-ink">{alert.title}</div>
                    <p className="mt-2 text-sm text-ink-muted">{alert.message}</p>
                  </div>
                ))}
                {dashboardData.alerts.length === 0 ? (
                  <div className="rounded-[16px] border-3 border-ink bg-[#f7f1de] p-3.5 text-sm text-ink-muted">
                    No driver-side alerts are active right now.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DriverSettingsPage;
