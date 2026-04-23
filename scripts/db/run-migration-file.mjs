/**
 * Ejecuta un archivo .sql contra DIRECT_POSTGRES_URL (uso local DBA).
 * Uso: node scripts/db/run-migration-file.mjs supabase/sql/08_align_live_enertech.sql
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadDirectPostgresUrl } from "./load-direct-url.mjs";

const file = process.argv[2];
if (!file) {
  console.error("Uso: node scripts/db/run-migration-file.mjs <ruta.sql>");
  process.exit(1);
}
const sqlPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client({ connectionString: loadDirectPostgresUrl() });
await client.connect();
try {
  await client.query(sql);
  console.log("OK:", sqlPath);
} finally {
  await client.end().catch(() => {});
}
