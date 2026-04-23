#!/usr/bin/env node
import pg from "pg";
const u = process.env.SUPABASE_DB_URL || process.argv[2];
if (!u?.startsWith("postgresql://")) process.exit(1);
const c = new pg.Client({ connectionString: u });
await c.connect();
const sample = await c.query(`
  SELECT p.id, p.slug, p.name, p.price, p.is_active,
         fc.name AS family_name, sc.name AS sub_name
  FROM enertech.products p
  LEFT JOIN enertech.categories fc ON fc.id = p.category_id
  LEFT JOIN enertech.categories sc ON sc.id = p.subcategory_id
  WHERE p.is_active = true
  ORDER BY p.name
  LIMIT 8
`);
console.log("Muestra catálogo (activos, para tienda):");
console.table(sample.rows);
const cnt = await c.query(`
  SELECT count(*)::int AS n FROM enertech.products WHERE is_active = true
`);
console.log("Total activos:", cnt.rows[0].n);
await c.end();
