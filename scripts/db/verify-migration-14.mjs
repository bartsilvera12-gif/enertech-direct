#!/usr/bin/env node
/**
 * Verifica objetos de supabase/sql/14_product_interest_events.sql sin imprimir secretos de conexión.
 */
import pg from "pg";

const url = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url?.startsWith("postgresql://")) {
  console.error("Falta SUPABASE_DB_URL (o DATABASE_URL) apuntando a Postgres.");
  process.exit(2);
}

function hostPort(u) {
  try {
    const parsed = new URL(u);
    return `${parsed.hostname}:${parsed.port || "5432"}`;
  } catch {
    return "(no parseado)";
  }
}

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  console.log("Conectado a Postgres en", hostPort(url));

  const table = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'enertech' AND table_name = 'product_interest_events'
    ) AS ok
  `);

  const fn1 = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'enertech'
        AND p.proname = 'record_product_event'
        AND oidvectortypes(p.proargtypes) = 'uuid, text, text, text'
    ) AS ok
  `);

  const fn2 = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'enertech'
        AND p.proname = 'admin_top_products_current_month'
        AND oidvectortypes(p.proargtypes) = 'integer'
    ) AS ok
  `);

  const exists = {
    table: table.rows[0].ok === true,
    record_product_event: fn1.rows[0].ok === true,
    admin_top_products_current_month: fn2.rows[0].ok === true,
  };

  console.log(JSON.stringify(exists, null, 2));
  await client.end();
  process.exit(exists.table && exists.record_product_event && exists.admin_top_products_current_month ? 0 : 1);
} catch (e) {
  console.error("ERROR:", e.message || e);
  await client.end().catch(() => {});
  process.exit(1);
}
