import { createServer } from "http";
import { env } from "./config/env";
import { app } from "./app";
import { initSocket } from "./lib/socket";
import { prisma } from "./lib/prisma";

const server = createServer(app);

initSocket(server);

server.listen(env.PORT, env.HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Smart Waste backend listening on ${env.HOST}:${env.PORT}`);
});

const shutdown = async () => {
  await prisma.$disconnect();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
