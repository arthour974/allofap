import "../src/load-env.ts";
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = process.argv[2] ?? path.join(__dirname, "../migrations/0001_wizard_share.sql");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query(sql);
  console.log(`Migration appliquée : ${path.basename(sqlPath)}`);
} finally {
  await client.end();
}
