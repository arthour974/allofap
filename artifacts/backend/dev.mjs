import { spawn, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const port = process.env.PORT ?? "8080";
const backendDir = path.dirname(fileURLToPath(import.meta.url));

/** Libère le port avant de lancer tsx (instance orpheline après crash / Ctrl+C). */
function freePort(targetPort) {
  try {
    const pids = execSync(`lsof -t -i:${targetPort}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(Number)
      .filter((pid) => pid !== process.pid);

    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        /* déjà terminé */
      }
    }

    if (pids.length > 0) {
      execSync("sleep 0.4");
    }
  } catch {
    /* port libre */
  }
}

freePort(port);

const child = spawn(
  "pnpm",
  ["exec", "tsx", "watch", "--clear-screen=false", "src/index.ts"],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  },
);

const forwardSignal = (signal) => {
  if (!child.killed) child.kill(signal);
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal === "SIGKILL" || signal === "SIGTERM") {
    process.exit(0);
  }
  process.exit(code ?? 0);
});
