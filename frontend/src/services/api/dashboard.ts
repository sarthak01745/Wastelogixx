import { api } from "./client";
import type { AdminOverview, DriverOverview } from "@/types/domain";

export const dashboardApi = {
  admin: async () => {
    const { data } = await api.get<AdminOverview>("/dashboard/admin");
    return data;
  },
  resources: async () => {
    const { data } = await api.get<{
      drivers: Array<{ id: string; name: string; email: string }>;
      trucks: Array<{
        id: string;
        truckNumber: string;
        status: string;
        model?: string | null;
        homeBase?: string | null;
        capacityKg?: number | null;
        driverId?: string | null;
      }>;
    }>("/dashboard/admin/resources");
    return data;
  },
  driver: async () => {
    const { data } = await api.get<DriverOverview>("/dashboard/driver");
    return data;
  },
};
