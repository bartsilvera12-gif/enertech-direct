#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadMigrationPostgresUrl } from "./load-direct-url.mjs";

const sqlPath = path.join(process.cwd(), "supabase/sql/09_full_enertech_alignment.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const url = loadMigrationPostgresUrl();
console.log("Conectando (SUPABASE_DB_URL prioritaria sobre DIRECT_POSTGRES_URL)…");

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(sql);
  console.log("OK: migración 09 aplicada.\n");

  const tables = ["products", "categories", "product_images"];
  for (const t of tables) {
    const { rows } = await client.query(
      `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'enertech' AND table_name = $1
      ORDER BY ordinal_position
    `,
      [t],
    );
    console.log(`--- enertech.${t} (${rows.length} columnas) ---`);
    console.table(rows.map((r) => ({ column: r.column_name, type: r.data_type, null: r.is_nullable })));
  }
} catch (e) {
  console.error("ERROR:", e.message || e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
