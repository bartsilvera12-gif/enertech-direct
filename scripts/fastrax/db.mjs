/**
 * Conexión PostgreSQL para los scripts Fastrax (escritura a schema enertech).
 * Reutiliza la misma prioridad de URI que los scripts DBA: SUPABASE_DB_URL → DIRECT_POSTGRES_URL
 * (env o .env.local). Ver docs/DBA.md. NUNCA se usa desde el bundle Vite.
 */
import pg from "pg";
import { loadMigrationPostgresUrl } from "../db/load-direct-url.mjs";

/** Ejecuta fn(client) con un cliente pg conectado y search_path = enertech. */
export async function withDb(fn) {
  const url = loadMigrationPostgresUrl();
  const client = new pg.Client({
    connectionString: url,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query("SET search_path TO enertech, public");
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}
