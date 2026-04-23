#!/usr/bin/env node
/**
 * Lista tablas y vistas en un schema (inspección previa).
 * Uso: SCHEMA=enertech node scripts/db/list-tables.mjs
 * Default SCHEMA=enertech
 */
import pg from "pg";
import { loadDirectPostgresUrl } from "./load-direct-url.mjs";

const schema = process.env.SCHEMA || "enertech";
const url = loadDirectPostgresUrl();
const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  const { rows } = await client.query(
    `
    SELECT table_schema, table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = $1
    ORDER BY table_type, table_name
  `,
    [schema],
  );
  console.log(`Tablas/vistas en schema "${schema}":\n`);
  console.table(rows);
} catch (e) {
  console.error(e.message || e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
