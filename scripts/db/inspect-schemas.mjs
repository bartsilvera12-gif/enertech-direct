#!/usr/bin/env node
/**
 * Lista schemas no del sistema (inspección previa a DDL).
 * Uso: node scripts/db/inspect-schemas.mjs
 */
import pg from "pg";
import { loadDirectPostgresUrl } from "./load-direct-url.mjs";

const url = loadDirectPostgresUrl();
const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  const { rows } = await client.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND schema_name NOT LIKE 'pg_%'
    ORDER BY schema_name
  `);
  console.log("Schemas (excl. sistema):\n");
  console.table(rows);
} catch (e) {
  console.error(e.message || e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
