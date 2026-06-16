import { useEffect, useMemo, useState } from "react";
import { trackingApi } from "@/services/api/tracking";
import { useSocket } from "./useSocket";

type PendingLog = {
  tripId: string;
  lat: number;
  lng: number;
  timestamp: string;
  speedKph?: number;
  heading?: number;
};

const queueKey = "route-shield-location-queue";

const readQueue = () => {
  const raw = localStorage.getItem(queueKey);
  return raw ? (JSON.parse(raw) as PendingLog[]) : [];
};

const writeQueue = (logs: PendingLog[]) => {
  localStorage.setItem(queueKey, JSON.stringify(logs));
};

export const useOfflineLocationSync = (tripId?: string | null, onSettled?: () => void) => {
  const socket = useSocket();
  const [pendingCount, setPendingCount] = useState(readQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [promptStopValidation, setPromptStopValidation] = useState(false);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onStopPrompt = (payload: { tripId: string }) => {
      if (!tripId || payload.tripId === tripId) {
        setPromptStopValidation(true);
      }
    };

    socket.on("driver:stop-validation", onStopPrompt);

    return () => {
      socket.off("driver:stop-validation", onStopPrompt);
    };
  }, [socket, tripId]);

  useEffect(() => {
    const flush = async () => {
      const queue = readQueue();

      if (!navigator.onLine || queue.length === 0) {
        setPendingCount(queue.length);
        return;
      }

      try {
        setIsSyncing(true);
        await trackingApi.sync(queue);
        writeQueue([]);
        setPendingCount(0);
        onSettled?.();
      } finally {
        setIsSyncing(false);
      }
    };

    const onOnline = () => {
      void flush();
    };

    window.addEventListener("online", onOnline);
    void flush();

    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [onSettled]);

  useEffect(() => {
    if (!tripId || !navigator.geolocation) {
      return;
    }

    const sendLocation = async () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const payload: PendingLog = {
            tripId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString(),
            speedKph: position.coords.speed ? Math.round(position.coords.speed * 3.6) : undefined,
            heading: position.coords.heading ?? undefined,
          };

          const queue = readQueue();

          if (!navigator.onLine) {
            writeQueue(queue.concat(payload));
            setPendingCount(queue.length + 1);
            return;
          }

          try {
            const result = await trackingApi.ingest(payload);
            if (result.requiresStopValidation) {
              setPromptStopValidation(true);
            }
            onSettled?.();
          } catch {
            writeQueue(queue.concat(payload));
            setPendingCount(queue.length + 1);
          }
        },
        () => undefined,
        {
          enableHighAccuracy: true,
        },
      );
    };

    const interval = window.setInterval(() => {
      void sendLocation();
    }, 10000);

    void sendLocation();

    return () => {
      window.clearInterval(interval);
    };
  }, [onSettled, tripId]);

  return useMemo(
    () => ({
      pendingCount,
      isSyncing,
      promptStopValidation,
      dismissStopValidationPrompt: () => setPromptStopValidation(false),
    }),
    [isSyncing, pendingCount, promptStopValidation],
  );
};
