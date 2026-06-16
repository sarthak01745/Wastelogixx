import type { Server as HttpServer } from "http";
import { UserRole } from "@prisma/client";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

type SocketIdentity = {
  id: string;
  role: UserRole;
  name: string;
};

let io: Server | null = null;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ||
      (typeof socket.handshake.headers.authorization === "string"
        ? socket.handshake.headers.authorization.replace("Bearer ", "")
        : undefined);

    if (!token) {
      return next();
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as SocketIdentity;
      socket.data.user = payload;
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketIdentity | undefined;

    if (user?.role === UserRole.ADMIN) {
      socket.join("admins");
    }

    if (user?.role === UserRole.DRIVER) {
      socket.join(`driver:${user.id}`);
    }
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }

  return io;
};

export const emitToAdmins = (event: string, payload: unknown) => {
  if (!io) {
    return;
  }

  io.to("admins").emit(event, payload);
};

export const emitToDriver = (driverId: string, event: string, payload: unknown) => {
  if (!io) {
    return;
  }

  io.to(`driver:${driverId}`).emit(event, payload);
};
