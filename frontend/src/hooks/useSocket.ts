import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export const useSocket = () => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    const connection = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    setSocket(connection);

    return () => {
      connection.disconnect();
      setSocket(null);
    };
  }, [token]);

  return socket;
};
