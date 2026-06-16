import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/services/api/dashboard";

export const useDriverOverview = () =>
  useQuery({
    queryKey: ["driver-overview"],
    queryFn: dashboardApi.driver,
    refetchInterval: 20000,
  });
