#!/usr/bin/env node
/**
 * Importa hoja "Import_Cursor" desde Excel a enertech (PostgreSQL directo).
 * Uso:
 *   SUPABASE_DB_URL=postgresql://... node scripts/db/import-enertech-excel.mjs [ruta.xlsx]
 *   node scripts/db/import-enertech-excel.mjs [ruta.xlsx] [databaseUrl]
 */

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import pg from "pg";

function slugify(input) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parsePYGNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "" || s === "-") return null;
  const n = Number(
    s
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ""),
  );
  return Number.isFinite(n) ? n : null;
}

function parsePriceStock(raw, fallbackNum) {
  const n = parsePYGNumber(raw);
  if (n === null) return fallbackNum;
  return n;
}

function parseBool(raw, defaultVal = false) {
  if (raw === null || raw === undefined || raw === "") return defaultVal;
  const s = String(raw).trim().toLowerCase();
  if (["true", "1", "yes", "sí", "si", "verdadero"].includes(s)) return true;
  if (["false", "0", "no", "falso"].includes(s)) return false;
  return defaultVal;
}

function parseJsonCol(raw, emptyVal) {
  if (raw === null || raw === undefined) return emptyVal;
  const s = String(raw).trim();
  if (s === "") return emptyVal;
  try {
    return JSON.parse(s);
  } catch {
    return emptyVal;
  }
}

function parseGallery(raw) {
  const j = parseJsonCol(raw, []);
  if (Array.isArray(j)) return j.map(String);
  if (typeof j === "string" && j.trim()) return [j.trim()];
  return [];
}

function parseSpecs(raw) {
  const j = parseJsonCol(raw, {});
  if (j && typeof j === "object" && !Array.isArray(j)) return j;
  return {};
}

function importableObservation(obs) {
  const o = String(obs ?? "").trim();
  if (!o) return true;
  if (/no\s*importar|omitir|descartar|rechaz/i.test(o)) return false;
  return /OK\s*para\s*importar/i.test(o);
}

const defaultExcel =
  process.platform === "win32"
    ? path.join(process.env.USERPROFILE ?? "", "OneDrive", "Desktop", "enertech_productos_corregido.xlsx")
    : "";

const excelPath =
  process.argv[2] || process.env.ENERTECH_IMPORT_XLSX || defaultExcel || "";
let dbUrl = process.argv[3] || process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!excelPath || !fs.existsSync(excelPath)) {
  console.error("Archivo Excel no encontrado. Pasá la ruta como primer argumento o ENERTECH_IMPORT_XLSX.");
  process.exit(1);
}
if (!dbUrl?.startsWith("postgresql://")) {
  console.error("Definí SUPABASE_DB_URL o pasá la URI como segundo argumento.");
  process.exit(1);
}

const wb = XLSX.readFile(excelPath);
const sheet = wb.Sheets["Import_Cursor"];
if (!sheet) {
  console.error('No existe la hoja "Import_Cursor".');
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

const stats = {
  categoriesCreated: 0,
  subcategoriesCreated: 0,
  inserted: 0,
  updated: 0,
  skipped: 0,
  errors: [],
};

const client = new pg.Client({ connectionString: dbUrl });

async function ensureUniqueProductSlug(base) {
  let slug = base || "producto";
  for (let i = 0; i < 500; i++) {
    const trySlug = i === 0 ? slug : `${base}-${i}`;
    const { rows: r } = await client.query(`SELECT id FROM enertech.products WHERE slug = $1 LIMIT 1`, [trySlug]);
    if (!r.length) return trySlug;
  }
  throw new Error("No slug único para producto");
}

async function findCategory(name, parentId) {
  const { rows } = await client.query(
    `
    SELECT id FROM enertech.categories
    WHERE lower(trim(name)) = lower(trim($1))
      AND parent_id IS NOT DISTINCT FROM $2::uuid
    LIMIT 1
  `,
    [String(name).trim(), parentId],
  );
  return rows[0]?.id ?? null;
}

async function insertCategory(name, parentId, kind) {
  const trimmed = String(name).trim();
  if (parentId) {
    const pr = await client.query(`SELECT parent_id FROM enertech.categories WHERE id = $1`, [parentId]);
    const prow = pr.rows[0];
    if (!prow) throw new Error(`Padre inexistente para categoría "${trimmed}".`);
    if (prow.parent_id != null) {
      throw new Error(`"${trimmed}": solo se permiten subcategorías bajo una categoría principal.`);
    }
  }
  let base = slugify(trimmed) || "categoria";
  for (let i = 0; i < 300; i++) {
    const slug = i === 0 ? base : `${base}-${i}`;
    try {
      const { rows } = await client.query(
        `
        INSERT INTO enertech.categories (name, slug, parent_id, is_active, sort_order)
        VALUES ($1, $2, $3, true, 0)
        RETURNING id
      `,
        [trimmed, slug, parentId],
      );
      if (kind === "family") stats.categoriesCreated += 1;
      else stats.subcategoriesCreated += 1;
      return rows[0].id;
    } catch (e) {
      if (e.code === "23505") continue;
      throw e;
    }
  }
  throw new Error(`Slug agotado para categoría: ${trimmed}`);
}

async function ensureCategory(name, parentId, kind) {
  const existing = await findCategory(name, parentId);
  if (existing) return existing;
  return insertCategory(name, parentId, kind);
}

await client.connect();

console.log("=== Inspección previa ===\n");
const catCount = await client.query(`SELECT count(*)::int AS n FROM enertech.categories`);
const prodCount = await client.query(`SELECT count(*)::int AS n FROM enertech.products`);
console.log(`enertech.categories: ${catCount.rows[0].n} filas`);
console.log(`enertech.products: ${prodCount.rows[0].n} filas\n`);

console.log(`Filas en Import_Cursor (sin cabecera JSON): ${rows.length}\n`);

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const rowNum = i + 2;
  try {
    const name = String(row.name ?? "").trim();
    if (!name) {
      stats.skipped += 1;
      stats.errors.push({ row: rowNum, msg: "Sin name; omitido." });
      continue;
    }
    if (!importableObservation(row.observacion_importacion)) {
      stats.skipped += 1;
      stats.errors.push({ row: rowNum, msg: `No importable (observacion): ${row.observacion_importacion}` });
      continue;
    }

    const family = String(row.family ?? "").trim();
    const sub = String(row.subcategory ?? "").trim();

    let categoryId = null;
    let subcategoryId = null;

    if (family) {
      categoryId = await ensureCategory(family, null, "family");
    }
    if (sub) {
      if (!categoryId) {
        categoryId = await ensureCategory(sub, null, "family");
        subcategoryId = null;
      } else {
        subcategoryId = await ensureCategory(sub, categoryId, "sub");
      }
    }

    const code = String(row.codigo ?? row.code ?? "").trim() || null;
    const sku = String(row.sku ?? "").trim() || code;

    let price = parsePYGNumber(row.price);
    if (price === null || price < 0) price = 0;
    const comparePrice = parsePYGNumber(row.compare_price);
    let stock = parsePYGNumber(row.stock);
    if (stock === null || stock < 0) stock = 0;
    stock = Math.max(0, Math.round(stock));

    const gallery = parseGallery(row.gallery);
    const specs = parseSpecs(row.specs);

    const payload = {
      code,
      sku,
      name,
      short_description: String(row.short_description ?? "").trim() || null,
      description: String(row.description ?? "").trim() || null,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      brand: String(row.brand ?? "").trim() || null,
      supplier: String(row.supplier ?? "").trim() || null,
      warehouse: String(row.warehouse ?? "").trim() || null,
      article_type: String(row.article_type ?? "").trim() || null,
      situation: String(row.situation ?? "").trim() || null,
      range_label: String(row.range_label ?? "").trim() || null,
      image_url: String(row.image_url ?? "").trim() || null,
      gallery: JSON.stringify(gallery.length ? gallery : []),
      price,
      compare_price: comparePrice,
      stock,
      track_stock: parseBool(row.track_stock, true),
      is_featured: parseBool(row.is_featured, false),
      is_active: parseBool(row.is_active, true),
      specs: JSON.stringify(specs),
      meta_title: String(row.meta_title ?? "").trim() || null,
      meta_description: String(row.meta_description ?? "").trim() || null,
      hero_slide_order: (() => {
        const h = row.hero_slide_order;
        if (h === null || h === undefined || String(h).trim() === "") return null;
        const n = Number(String(h).replace(",", "."));
        return Number.isFinite(n) ? Math.round(n) : null;
      })(),
    };

    let existingId = null;
    if (sku) {
      const r1 = await client.query(`SELECT id FROM enertech.products WHERE sku = $1 LIMIT 1`, [sku]);
      if (r1.rows[0]) existingId = r1.rows[0].id;
    }
    if (!existingId && code) {
      const r2 = await client.query(`SELECT id FROM enertech.products WHERE code = $1 LIMIT 1`, [code]);
      if (r2.rows[0]) existingId = r2.rows[0].id;
    }

    if (existingId) {
      await client.query(
        `
        UPDATE enertech.products SET
          code = $1,
          sku = $2,
          name = $3,
          short_description = $4,
          description = $5,
          category_id = $6,
          subcategory_id = $7,
          brand = $8,
          supplier = $9,
          warehouse = $10,
          article_type = $11,
          situation = $12,
          range_label = $13,
          image_url = $14,
          gallery = $15::jsonb,
          price = $16,
          compare_price = $17,
          stock = $18,
          track_stock = $19,
          is_featured = $20,
          is_active = $21,
          specs = $22::jsonb,
          meta_title = $23,
          meta_description = $24,
          hero_slide_order = $25,
          updated_at = now()
        WHERE id = $26::uuid
      `,
        [
          payload.code,
          payload.sku,
          payload.name,
          payload.short_description,
          payload.description,
          payload.category_id,
          payload.subcategory_id,
          payload.brand,
          payload.supplier,
          payload.warehouse,
          payload.article_type,
          payload.situation,
          payload.range_label,
          payload.image_url,
          payload.gallery,
          payload.price,
          payload.compare_price,
          payload.stock,
          payload.track_stock,
          payload.is_featured,
          payload.is_active,
          payload.specs,
          payload.meta_title,
          payload.meta_description,
          payload.hero_slide_order,
          existingId,
        ],
      );
      stats.updated += 1;
    } else {
      const slugBase = slugify(`${payload.name}-${code ?? sku ?? "p"}`).slice(0, 110);
      const slug = await ensureUniqueProductSlug(slugBase || slugify(payload.name));

      await client.query(
        `
        INSERT INTO enertech.products (
          slug,
          code, sku, name, short_description, description,
          category_id, subcategory_id,
          brand, supplier, warehouse, article_type, situation, range_label,
          image_url, gallery,
          price, compare_price, stock,
          track_stock, is_featured, is_active,
          specs, meta_title, meta_description, hero_slide_order
        ) VALUES (
          $1,
          $2, $3, $4, $5, $6,
          $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16::jsonb,
          $17, $18, $19,
          $20, $21, $22,
          $23::jsonb, $24, $25, $26
        )
      `,
        [
          slug,
          payload.code,
          payload.sku,
          payload.name,
          payload.short_description,
          payload.description,
          payload.category_id,
          payload.subcategory_id,
          payload.brand,
          payload.supplier,
          payload.warehouse,
          payload.article_type,
          payload.situation,
          payload.range_label,
          payload.image_url,
          payload.gallery,
          payload.price,
          payload.compare_price,
          payload.stock,
          payload.track_stock,
          payload.is_featured,
          payload.is_active,
          payload.specs,
          payload.meta_title,
          payload.meta_description,
          payload.hero_slide_order,
        ],
      );
      stats.inserted += 1;
    }
  } catch (e) {
    stats.errors.push({ row: rowNum, msg: e instanceof Error ? e.message : String(e) });
  }
}

await client.end();

console.log("=== Resumen ===\n");
console.log(JSON.stringify(stats, null, 2));

const c2 = new pg.Client({ connectionString: dbUrl });
await c2.connect();
const v = await c2.query(`
  SELECT count(*) FILTER (WHERE is_active = true)::int AS active_n,
         count(*)::int AS total_n
  FROM enertech.products
`);
console.log("\nCatálogo (enertech.products): activos / total =", v.rows[0]);
await c2.end();
