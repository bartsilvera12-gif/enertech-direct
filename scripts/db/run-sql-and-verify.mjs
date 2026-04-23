#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const a2 = process.argv[2];
const a3 = process.argv[3];

let sqlPath = path.join(process.cwd(), "supabase/sql/10_enertech_sync_admin.sql");
let url;

if (a2?.startsWith("postgresql://")) {
  url = a2;
} else if (a2) {
  sqlPath = path.isAbsolute(a2) ? a2 : path.join(process.cwd(), a2);
  url = a3 || process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
} else {
  url = process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
}

if (!url?.startsWith("postgresql://")) {
  console.error(
    "Uso: node scripts/db/run-sql-and-verify.mjs [archivo.sql] <URI>\n   o: node scripts/db/run-sql-and-verify.mjs <URI>\n   o: DATABASE_URL / SUPABASE_DB_URL",
  );
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

async function listCols(table) {
  const { rows } = await client.query(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'enertech' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [table],
  );
  return rows;
}

try {
  await client.connect();
  console.log("SQL file:", sqlPath, "\n");
  await client.query(sql);
  console.log("OK — migración aplicada.\n");

  for (const t of ["products", "categories", "product_images"]) {
    const rows = await listCols(t);
    console.log(`=== enertech.${t} (${rows.length} columnas) ===`);
    console.table(rows.map((r) => ({ column: r.column_name, type: r.data_type, null: r.is_nullable })));
  }

  const { rows: ix } = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'enertech' AND tablename = 'products' AND indexname LIKE 'idx_products_%'
    ORDER BY indexname
  `);
  console.log("\nÍndices idx_products_*:", ix.map((r) => r.indexname).join(", ") || "(ninguno)");

  await client.end();
} catch (e) {
  console.error("ERROR:", e.message || e);
  await client.end().catch(() => {});
  process.exit(1);
}
