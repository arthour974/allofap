import { execSync } from "node:child_process";

/** Tue les processus qui écoutent sur le port (sauf le PID courant). Dev uniquement. */
export function killListenersOnPort(targetPort: number): number[] {
  try {
    const output = execSync(`lsof -t -iTCP:${targetPort} -sTCP:LISTEN`, {
      encoding: "utf8",
    }).trim();

    if (!output) return [];

    const killed: number[] = [];
    const self = process.pid;

    for (const line of output.split("\n")) {
      const pid = Number(line);
      if (!pid || pid === self) continue;
      try {
        process.kill(pid, "SIGKILL");
        killed.push(pid);
      } catch {
        /* processus déjà terminé */
      }
    }

    return killed;
  } catch {
    return [];
  }
}
