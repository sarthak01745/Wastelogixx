import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Outlet, useOutletContext } from "react-router-dom";
import { AppShell } from "@/components/app/AppShell";
import { StopValidationModal } from "@/components/driver/StopValidationModal";
import { driverNavItems, driverSettingsDefaults, driverShellSubtitle, driverShellTitle } from "@/features/driver/driver-config";
import { useDriverOverview } from "@/features/driver/useDriverOverview";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useOfflineLocationSync } from "@/hooks/useOfflineLocationSync";
import type { DriverOverview, Task } from "@/types/domain";

type DriverLayoutContextValue = {
  dashboardData: DriverOverview;
  currentTrip: Task | null;
  settings: typeof driverSettingsDefaults;
  toggleSetting: <K extends keyof typeof driverSettingsDefaults>(key: K) => void;
  refreshDriverOverview: () => void;
  openStopValidation: () => void;
  locationSync: ReturnType<typeof useOfflineLocationSync>;
};

export const useDriverLayout = () => useOutletContext<DriverLayoutContextValue>();

const DriverLayout = () => {
  const queryClient = useQueryClient();
  const [manualStopPrompt, setManualStopPrompt] = useState(false);
  const { settings, toggleSetting } = useDashboardSettings("route-shield-driver-settings", driverSettingsDefaults);

  const refreshDriverOverview = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["driver-overview"] });
  }, [queryClient]);

  const dashboardQuery = useDriverOverview();
  const currentTrip = dashboardQuery.data?.currentTrip ?? null;
  const currentTrail = currentTrip?.locationLogs ?? [];
  const latestLocation = currentTrail[currentTrail.length - 1] ?? null;
  const locationSync = useOfflineLocationSync(currentTrip?.id, refreshDriverOverview);

  const contextValue = useMemo<DriverLayoutContextValue | null>(() => {
    if (!dashboardQuery.data) {
      return null;
    }

    return {
      dashboardData: dashboardQuery.data,
      currentTrip,
      settings,
      toggleSetting,
      refreshDriverOverview,
      openStopValidation: () => setManualStopPrompt(true),
      locationSync,
    };
  }, [currentTrip, dashboardQuery.data, locationSync, refreshDriverOverview, settings, toggleSetting]);

  return (
    <AppShell role="DRIVER" subtitle={driverShellSubtitle} title={driverShellTitle} navItems={driverNavItems}>
      {dashboardQuery.isLoading || !contextValue ? (
        <div className="panel-card text-sm text-ink-muted">Loading driver workspace...</div>
      ) : (
        <Outlet context={contextValue} />
      )}

      <StopValidationModal
        open={manualStopPrompt || locationSync.promptStopValidation}
        tripId={currentTrip?.id ?? null}
        detectedLocation={latestLocation}
        onClose={() => {
          setManualStopPrompt(false);
          locationSync.dismissStopValidationPrompt();
        }}
        onSubmitted={refreshDriverOverview}
      />
    </AppShell>
  );
};

export default DriverLayout;
