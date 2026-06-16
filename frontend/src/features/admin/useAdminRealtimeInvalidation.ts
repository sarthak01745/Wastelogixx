import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/useSocket";

export const useAdminRealtimeInvalidation = (selectedTaskId?: string | null) => {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) {
      return;
    }

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });

      if (selectedTaskId) {
        void queryClient.invalidateQueries({ queryKey: ["task-replay", selectedTaskId] });
      }
    };

    socket.on("tracking:update", invalidate);
    socket.on("alert:new", invalidate);

    return () => {
      socket.off("tracking:update", invalidate);
      socket.off("alert:new", invalidate);
    };
  }, [queryClient, selectedTaskId, socket]);
};
