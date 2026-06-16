import { useEffect, useState } from "react";

type DashboardSettings = Record<string, boolean>;

const readSettings = <T extends DashboardSettings>(storageKey: string, defaults: T): T => {
  if (typeof window === "undefined") {
    return defaults;
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return defaults;
  }

  try {
    return {
      ...defaults,
      ...(JSON.parse(raw) as Partial<T>),
    };
  } catch {
    return defaults;
  }
};

export const useDashboardSettings = <T extends DashboardSettings>(storageKey: string, defaults: T) => {
  const [settings, setSettings] = useState<T>(() => readSettings(storageKey, defaults));

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  const toggleSetting = <K extends keyof T>(key: K) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return {
    settings,
    setSettings,
    toggleSetting,
  };
};
