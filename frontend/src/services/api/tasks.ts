import { api } from "./client";
import type { RoutePlan, Task, TripReplay } from "@/types/domain";

export const taskApi = {
  list: async () => {
    const { data } = await api.get<Task[]>("/tasks");
    return data;
  },
  create: async (payload: Record<string, unknown>) => {
    const { data } = await api.post<Task>("/tasks", payload);
    return data;
  },
  planRoute: async (payload: { originQuery: string; destinationQuery: string }) => {
    const { data } = await api.post<RoutePlan>("/tasks/plan-route", payload);
    return data;
  },
  start: async (taskId: string) => {
    const { data } = await api.post<Task>(`/tasks/${taskId}/start`);
    return data;
  },
  complete: async (taskId: string) => {
    const { data } = await api.post<Task>(`/tasks/${taskId}/complete`);
    return data;
  },
  replay: async (taskId: string) => {
    const { data } = await api.get<TripReplay>(`/tasks/${taskId}/replay`);
    return data;
  },
};
