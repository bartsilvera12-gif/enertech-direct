#!/usr/bin/env node
/**
 * Ejecuta 13_normalize_categories_two_levels.sql con informe antes/después.
 * Uso: node scripts/db/report-normalize-13.mjs <postgresql-uri>
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.argv[2] || process.env.SUPABASE_DB_URL?.trim();
if (!url?.startsWith("postgresql://")) {
  console.error("Uso: node scripts/db/report-normalize-13.mjs <URI>");
  process.exit(1);
}

const sqlPath = path.join(process.cwd(), "supabase/sql/13_normalize_categories_two_levels.sql");

async function stats(client, label) {
  const roots = await client.query(
    `SELECT count(*)::int AS n FROM enertech.categories WHERE parent_id IS NULL`,
  );
  const subs = await client.query(
    `SELECT count(*)::int AS n FROM enertech.categories WHERE parent_id IS NOT NULL`,
  );
  const invalidSubs = await client.query(`
    SELECT count(*)::int AS n
    FROM enertech.categories c
    JOIN enertech.categories p ON p.id = c.parent_id
    WHERE p.parent_id IS NOT NULL
  `);
  const badProducts = await client.query(`
    SELECT count(*)::int AS n
    FROM enertech.products p
    JOIN enertech.categories sub ON p.category_id = sub.id
    WHERE sub.parent_id IS NOT NULL
  `);
  return {
    label,
    roots: roots.rows[0].n,
    subs: subs.rows[0].n,
    invalid_sub_parents: invalidSubs.rows[0].n,
    products_category_points_to_sub: badProducts.rows[0].n,
  };
}

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();

  const before = await stats(client, "ANTES");

  const productsToFix = before.products_category_points_to_sub;

  console.log("\n=== ESTADÍSTICAS ANTES ===\n");
  console.log(JSON.stringify(before, null, 2));

  /** Aplanar niveles profundos con registro por iteración */
  let iteration = 0;
  let totalFlattened = 0;
  for (;;) {
    const r = await client.query(`
      UPDATE enertech.categories AS child
      SET parent_id = parent.parent_id
      FROM enertech.categories AS parent
      WHERE child.parent_id = parent.id
        AND parent.parent_id IS NOT NULL
    `);
    iteration += 1;
    totalFlattened += r.rowCount;
    if (r.rowCount === 0) break;
    console.log(`  Paso de aplanado #${iteration}: ${r.rowCount} fila(s) de categorías relinkadas`);
  }
  console.log(`\nTotal filas tocadas en aplanado (suma iteraciones): ${totalFlattened}`);
  console.log(`Iteraciones hasta converger: ${iteration}\n`);

  const upd = await client.query(`
    UPDATE enertech.products AS p
    SET
      category_id = r.id,
      subcategory_id = sub.id
    FROM enertech.categories AS sub
    JOIN enertech.categories AS r ON r.id = sub.parent_id
    WHERE p.category_id = sub.id
      AND sub.parent_id IS NOT NULL
    RETURNING p.id
  `);

  const productsCorrected = upd.rowCount ?? upd.rows.length;

  const after = await stats(client, "DESPUÉS");

  console.log("=== ESTADÍSTICAS DESPUÉS ===\n");
  console.log(JSON.stringify(after, null, 2));

  console.log("\n=== RESUMEN ===\n");
  console.log(`Categorías raíz (parent_id NULL): ${before.roots} → ${after.roots}`);
  console.log(`Subcategorías (parent_id NOT NULL): ${before.subs} → ${after.subs}`);
  console.log(
    `Enlaces inválidos (sub bajo sub): ${before.invalid_sub_parents} → ${after.invalid_sub_parents} (objetivo 0)`,
  );
  console.log(
    `Productos con category_id apuntando a una sub: ${before.products_category_points_to_sub} → ${after.products_category_points_to_sub} (objetivo 0)`,
  );
  console.log(`\nProductos corregidos en esta ejecución (UPDATE): ${productsCorrected}`);
  console.log(`(Esperado ≈ filas candidatas antes: ${productsToFix})\n`);

  const sqlOnDisk = fs.readFileSync(sqlPath, "utf8");
  console.log("--- SQL aplicado (equivalente a archivo) ---\n");
  console.log(sqlOnDisk);

  await client.end();
} catch (e) {
  console.error("ERROR:", e.message || e);
  await client.end().catch(() => {});
  process.exit(1);
}
