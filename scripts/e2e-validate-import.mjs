#!/usr/bin/env node
/**
 * Validación E2E: PostgREST (mismo stack que Vite) vs productos importados + hero.
 * Opcional: SUPABASE_DB_URL (postgres directo 6432) para marcar producto destacado en hero.
 *
 * Uso:
 *   node scripts/e2e-validate-import.mjs
 *   SUPABASE_DB_URL=postgresql://user:pass@host:6432/postgres node scripts/e2e-validate-import.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const DEFAULT_CARD_IMG =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880618/ed87b586-7ad8-442b-aac0-5826742a33b1.png";

const PRODUCT_EMBED = `
  *,
  category:categories!category_id (*),
  subcategory:categories!subcategory_id (*),
  product_images (*)
`;

const HERO_SLIDER_SELECT = `
  id,
  name,
  slug,
  is_featured,
  created_at,
  image_url,
  gallery,
  hero_slide_order,
  product_images ( url, sort_order, alt )
`;

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) throw new Error("Falta .env.local");
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

function withImageRow(row) {
  const url = row.image_url?.trim();
  if (url) return true;
  const gi = row.gallery;
  if (Array.isArray(gi) && gi.length && typeof gi[0] === "string") return true;
  const imgs = row.product_images;
  if (Array.isArray(imgs) && imgs.some((x) => x?.url?.trim())) return true;
  return false;
}

async function fetchHeroSliderProducts(supabase, limit = 5) {
  const cap = Math.max(limit * 10, 40);
  const { data: feat, error: e1 } = await supabase
    .from("products")
    .select(HERO_SLIDER_SELECT)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("hero_slide_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(cap);
  if (e1) throw e1;

  let out = (feat ?? []).filter(withImageRow);
  if (out.length >= limit) return out.slice(0, limit);

  const { data: recent, error: e2 } = await supabase
    .from("products")
    .select(HERO_SLIDER_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (e2) throw e2;

  const ids = new Set(out.map((p) => p.id));
  for (const row of recent ?? []) {
    if (out.length >= limit) break;
    if (!ids.has(row.id) && withImageRow(row)) {
      out.push(row);
      ids.add(row.id);
    }
  }
  return out.slice(0, limit);
}

const envLocal = loadEnvLocal();
const viteUrl = envLocal.VITE_SUPABASE_URL?.trim();
const anonKey = envLocal.VITE_SUPABASE_ANON_KEY?.trim();

if (!viteUrl || !anonKey) {
  console.error("VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY ausentes en .env.local");
  process.exit(1);
}

const supabaseUrl = /^https?:\/\//i.test(viteUrl) ? viteUrl : `https://${viteUrl}`;
const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
  db: { schema: "enertech" },
});

const report = {
  vite_supabase_url: supabaseUrl,
  catalog_count_active: null,
  sample_products: [],
  checks: [],
  hero_after_update: null,
  errors: [],
};

try {
  const { count: catCount, error: eCat } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (eCat) throw eCat;
  report.catalog_count_active = catCount;

  const { data: sample, error: eS } = await supabase
    .from("products")
    .select("id, slug, name, code, sku, is_active, is_featured, image_url")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(10);
  if (eS) throw eS;

  const three = (sample ?? []).slice(0, 3);
  if (three.length < 3) {
    report.errors.push(`Menos de 3 productos activos para probar (${three.length}).`);
  }

  for (const p of three) {
    const slug = p.slug;
    const searchTerm = String(p.code ?? p.sku ?? "").trim() || String(p.name).slice(0, 8).trim();

    const { data: catalogRows, error: ec } = await supabase
      .from("products")
      .select("id")
      .eq("is_active", true);
    if (ec) throw ec;
    const inCatalog = catalogRows?.some((r) => r.id === p.id) ?? false;

    const { data: fullRows } = await supabase
      .from("products")
      .select(PRODUCT_EMBED)
      .eq("is_active", true);
    const filtered =
      fullRows?.filter((row) => {
        const hay = [
          row.name,
          row.slug,
          row.sku,
          row.code,
          row.brand,
          row.supplier,
          row.warehouse,
          row.article_type,
          row.situation,
          row.range_label,
          row.category?.name,
          row.subcategory?.name,
          row.short_description,
          row.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(searchTerm.toLowerCase());
      }) ?? [];
    const inSearch = filtered.some((r) => r.id === p.id);

    const { data: detail, error: ed } = await supabase
      .from("products")
      .select(PRODUCT_EMBED)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (ed) throw ed;
    const detailOk = Boolean(detail?.id === p.id && detail.name);

    report.sample_products.push({
      code: p.code,
      slug,
      name: p.name,
      in_catalog_list: inCatalog,
      in_search_simulation: inSearch,
      detail_loaded: detailOk,
    });

    report.checks.push({
      slug,
      catalog: inCatalog ? "OK" : "FAIL",
      search: inSearch ? "OK" : "FAIL",
      detail: detailOk ? "OK" : "FAIL",
    });
  }

  const dbaUrl = process.env.SUPABASE_DB_URL?.trim();
  let heroTargetId = null;

  if (dbaUrl?.startsWith("postgresql://")) {
    const heroSlug = three[0]?.slug;
    if (heroSlug) {
      const client = new pg.Client({ connectionString: dbaUrl });
      await client.connect();
      const { rows } = await client.query(
        `UPDATE enertech.products
         SET is_featured = true,
             hero_slide_order = 1,
             image_url = COALESCE(NULLIF(trim(image_url), ''), $2),
             updated_at = now()
         WHERE slug = $1 AND is_active = true
         RETURNING id, slug, name`,
        [heroSlug, DEFAULT_CARD_IMG],
      );
      await client.end();
      if (rows[0]) {
        heroTargetId = rows[0].id;
        report.hero_updated = rows[0];
      }
    }
  } else {
    report.hero_updated = null;
    report.hero_note =
      "SUPABASE_DB_URL no definido: no se marcó producto hero en BD (pasá URI directa 6432 si querés esta parte).";
  }

  const slides = await fetchHeroSliderProducts(supabase, 5);
  report.hero_after_update = {
    ids: slides.map((s) => s.id),
    slugs: slides.map((s) => s.slug),
    first_slug: slides[0]?.slug ?? null,
  };

  if (heroTargetId && !slides.some((s) => s.id === heroTargetId)) {
    report.errors.push(
      "El producto marcado para hero no aparece en los primeros slides (revisá imagen, is_active, is_featured, orden).",
    );
  }
} catch (e) {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null && "message" in e
        ? String((e).message)
        : JSON.stringify(e);
  report.errors.push(msg);
}

console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exit(1);
