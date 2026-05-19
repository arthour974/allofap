import type { Server } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { killListenersOnPort } from "./lib/free-port.js";

const port = Number(process.env.PORT ?? 8080);
const isDev = process.env.NODE_ENV !== "production";

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

let server: Server;
let isShuttingDown = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server = app.listen({ port, host: "0.0.0.0" });

    server.once("listening", () => {
      logger.info({ port }, "Server listening");
      resolve();
    });

    server.once("error", (err: NodeJS.ErrnoException) => {
      reject(err);
    });
  });
}

async function preparePort(): Promise<void> {
  if (!isDev) return;

  const killed = killListenersOnPort(port);
  if (killed.length > 0) {
    logger.info({ port, pids: killed }, "Ancienne instance libérée");
    await sleep(300);
  }
}

async function listenWithRetry(maxAttempts = 5): Promise<void> {
  await preparePort();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await startServer();
      return;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code !== "EADDRINUSE" || attempt === maxAttempts) {
        if (error.code === "EADDRINUSE") {
          logger.error(
            { port, hint: `kill $(lsof -t -iTCP:${port} -sTCP:LISTEN)` },
            "Port déjà utilisé après plusieurs tentatives",
          );
        } else {
          logger.error({ err: error }, "Error listening on port");
        }
        process.exit(1);
      }

      const killed = killListenersOnPort(port);
      if (killed.length > 0) {
        logger.warn({ port, pids: killed, attempt }, "Port libéré, nouvelle tentative…");
      } else {
        logger.warn({ port, attempt }, "Port occupé, nouvelle tentative…");
      }
      await sleep(350);
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, "Arrêt du serveur…");

  if (server) {
    server.closeAllConnections?.();
    await Promise.race([
      new Promise<void>((resolve) => server.close(() => resolve())),
      sleep(500),
    ]);
  }

  await Promise.race([pool.end(), sleep(300)]).catch((err) =>
    logger.warn({ err }, "pool.end failed"),
  );

  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await listenWithRetry();
