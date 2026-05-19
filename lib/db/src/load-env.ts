import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

/**
 * Charge le `.env` à la racine du monorepo (recherche depuis process.cwd() vers le haut).
 */
function loadWorkspaceEnv(): void {
  let dir = process.cwd();

  for (let i = 0; i < 8; i++) {
    const envPath = path.join(dir, ".env");
    if (existsSync(envPath)) {
      config({ path: envPath });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

loadWorkspaceEnv();
