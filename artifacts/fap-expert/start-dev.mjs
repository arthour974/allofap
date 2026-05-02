import { createServer } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = await createServer({
  configFile: resolve(__dirname, "vite.config.ts"),
  server: {
    host: "0.0.0.0",
  },
});

await server.listen();
server.printUrls();

// Keep the Node.js process alive — prevent exit when event loop empties
const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

// Also ref the HTTP server handle explicitly
if (server.httpServer) {
  server.httpServer.ref();
}

const shutdown = async () => {
  clearInterval(keepAlive);
  await server.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("Dev server running. Press Ctrl+C to stop.");
