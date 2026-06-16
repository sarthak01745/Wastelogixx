import { api } from "./client";
import type { Task } from "@/types/domain";

type TrackingPayload = {
  tripId: string;
  lat: number;
  lng: number;
  timestamp: string;
  speedKph?: number;
  heading?: number;
};

export const trackingApi = {
  ingest: async (payload: TrackingPayload) => {
    const { data } = await api.post<{
      requiresStopValidation: boolean;
      riskLevel: string;
      riskScore: number;
    }>("/tracking/ingest", payload);
    return data;
  },
  sync: async (logs: TrackingPayload[]) => {
    const { data } = await api.post<{ count: number; ids: string[] }>("/tracking/sync", { logs });
    return data;
  },
  justifyStop: async (tripId: string, reason: string, image: Blob) => {
    const formData = new FormData();
    formData.append("reason", reason);
    formData.append("image", image, `stop-proof-${Date.now()}.jpg`);

    const { data } = await api.post(`/tracking/tasks/${tripId}/justify`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },
  tripLogs: async (tripId: string) => {
    const { data } = await api.get<Task>(`/tracking/tasks/${tripId}/logs`);
    return data;
  },
};
