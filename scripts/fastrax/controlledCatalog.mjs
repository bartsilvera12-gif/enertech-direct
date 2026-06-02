/**
 * Búsqueda Fastrax sin escribir DB e importación acotada por SKUs.
 *
 * - `searchFastraxReadonlyOpe4Ope2({q,page,size,only_stock,sku})` — ope=4 una
 *   página + ope=2 batch para los SKUs filtrados. NO escribe.
 * - `searchFastraxFastListOpe4Only({page,size,only_stock,q})` — solo ope=4.
 * - `searchFastraxAllPagesOpe4Global({q,maxPages,maxResults,only_stock})` —
 *   recorre páginas ope=4 hasta encontrar coincidencias o agotar tope.
 * - `loadFastraxBatchDetailsForSkus(skus)` — wrapper de `getProductDetailsBatch`.
 * - `importFastraxSkusToProducts(skus)`/`importFastraxItemsToProducts(items)`
 *   /`importFastraxPageWithBatch({page,size})`/`importFastraxPageRangeWithBatch`.
 *
 * Pre-bloqueo: SKUs ya curados localmente (product_source_type='enertech' y
 * `external_provider` distinto a 'fastrax') no se reescriben — se reportan
 * como `skipped:'blocked_local'` para no pisar el catálogo curado.
 *
 * Adaptado de tradexpar-digital-hub/server/src/integrations/fastrax/controlledCatalog.js.
 */
import {
  fastraxDetailBatchSize,
  fastraxDetailConcurrency,
  fastraxOpe4DefaultPageSize,
  getProductDetails,
  getProductDetailsBatch,
  listFastraxProductsOpe4,
} from "./client.mjs";
import { extractProductRows, mapFastraxRowToProduct, pickSkuFromRow, FASTRAX_SOURCE } from "./mapper.mjs";
import { upsertFastraxFromImportItem, upsertFastraxFromRawRow } from "./fastraxProductUpsert.mjs";
import { withDb } from "./db.mjs";

const MAX_SEARCH_PAGES_GLOBAL = 30;
const MAX_RESULTS_GLOBAL = 200;

function s(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** Estima cantidad de imágenes (raw_detail.img: número). */
function pickImagesCountFromOpe2(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return 0;
  const v = raw.img ?? raw.Img;
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.max(0, Math.floor(v));
  const t = String(v).trim();
  if (!t) return 0;
  if (/^-?\d+([.,]\d+)?$/.test(t)) {
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return 1;
}

function filterByTextAndStock(rows, { q, only_stock } = {}) {
  const qn = s(q).toLowerCase();
  return rows
    .map((r) => {
      const m = mapFastraxRowToProduct(r);
      if (!m) return null;
      return { ...m, raw: r };
    })
    .filter(Boolean)
    .filter((m) => {
      if (only_stock && !(m.stock > 0)) return false;
      if (!qn) return true;
      const hay = [m.fastrax_sku, m.name, m.brand, m.category, m.description].map((x) => s(x).toLowerCase()).join(" ");
      return hay.includes(qn);
    });
}

/** SKUs locales que el sync de Fastrax NO debe pisar. */
async function getBlockedSkusForFastraxImport(client, skus) {
  const blocked = new Set();
  if (!Array.isArray(skus) || skus.length === 0) return blocked;
  const uniq = [...new Set(skus.map(s).filter(Boolean))];
  if (uniq.length === 0) return blocked;
  try {
    const r = await client.query(
      `SELECT sku FROM products
        WHERE sku = ANY($1::text[])
          AND COALESCE(product_source_type, 'enertech') = 'enertech'
          AND (external_provider IS NULL OR external_provider <> $2)
          AND fastrax_sku IS NULL`,
      [uniq, FASTRAX_SOURCE],
    );
    for (const row of r.rows) if (row.sku) blocked.add(String(row.sku));
  } catch (e) {
    console.warn(`[fastrax/import] block lookup failed: ${e instanceof Error ? e.message : e}`);
  }
  return blocked;
}

/** ope=4 página + ope=2 batch sobre los SKUs filtrados. */
export async function searchFastraxReadonlyOpe4Ope2({ q, page, size, only_stock, sku } = {}) {
  const defaultSize = Math.min(20, fastraxOpe4DefaultPageSize());
  const pg = Math.max(1, Math.floor(Number(page) || 1));
  const sz = Math.max(1, Math.min(20, Math.floor(Number(size) || defaultSize)));

  // Caso "buscar por SKU específico": ir directo a ope=2.
  const oneSku = s(sku);
  if (oneSku) {
    const r = await getProductDetails(oneSku);
    if (!r || !r.ok) {
      return { ok: false, message: r?.message || "ope2", parsed: r?.parsed };
    }
    const rows = extractProductRows(r._fastrax_data ?? r.parsed);
    const items = filterByTextAndStock(rows, { q, only_stock });
    return { ok: true, ope: 2, page: 1, size: items.length, total: items.length, items };
  }

  const r4 = await listFastraxProductsOpe4(pg, sz);
  if (!r4 || !r4.ok) return { ok: false, message: r4?.message || "ope4", parsed: r4?.parsed };
  const indexRows = extractProductRows(r4._fastrax_data ?? r4.parsed);
  const skus = indexRows.map(pickSkuFromRow).filter(Boolean);
  if (skus.length === 0) return { ok: true, ope: 4, page: pg, size: sz, total: 0, items: [] };

  const b = await getProductDetailsBatch(skus, {
    batchSize: fastraxDetailBatchSize(),
    concurrency: fastraxDetailConcurrency(),
  });
  const rows = [];
  for (const sk of skus) {
    const raw = b.bySku.get(sk);
    if (raw) rows.push(raw);
  }
  const items = filterByTextAndStock(rows, { q, only_stock });
  return {
    ok: true,
    ope: "4+2",
    page: pg,
    size: sz,
    total: items.length,
    items,
    stats: b.stats,
  };
}

/** Solo ope=4 (sin ope=2). Datos limitados a lo que devuelve el índice. */
export async function searchFastraxFastListOpe4Only({ page, size, only_stock, q } = {}) {
  const pg = Math.max(1, Math.floor(Number(page) || 1));
  const sz = Math.max(1, Math.min(500, Math.floor(Number(size) || fastraxOpe4DefaultPageSize())));
  const r4 = await listFastraxProductsOpe4(pg, sz);
  if (!r4 || !r4.ok) return { ok: false, message: r4?.message || "ope4", parsed: r4?.parsed };
  const rows = extractProductRows(r4._fastrax_data ?? r4.parsed);
  const items = filterByTextAndStock(rows, { q, only_stock });
  return { ok: true, ope: 4, page: pg, size: sz, total: items.length, items };
}

/** Recorre páginas ope=4 acumulando coincidencias hasta el tope. */
export async function searchFastraxAllPagesOpe4Global({ q, maxPages, maxResults, only_stock } = {}) {
  const pages = Math.max(1, Math.min(MAX_SEARCH_PAGES_GLOBAL, Math.floor(Number(maxPages) || MAX_SEARCH_PAGES_GLOBAL)));
  const maxR = Math.max(1, Math.min(MAX_RESULTS_GLOBAL, Math.floor(Number(maxResults) || MAX_RESULTS_GLOBAL)));
  const size = Math.min(500, fastraxOpe4DefaultPageSize());
  const out = [];
  for (let p = 1; p <= pages; p += 1) {
    const r4 = await listFastraxProductsOpe4(p, size);
    if (!r4 || !r4.ok) return { ok: false, message: r4?.message || "ope4", page: p, parsed: r4?.parsed, items: out };
    const rows = extractProductRows(r4._fastrax_data ?? r4.parsed);
    if (rows.length === 0) break;
    const matches = filterByTextAndStock(rows, { q, only_stock });
    for (const it of matches) {
      out.push(it);
      if (out.length >= maxR) break;
    }
    if (out.length >= maxR) break;
    if (rows.length < size) break;
  }
  return { ok: true, ope: 4, pages_scanned: Math.min(pages, out.length === 0 ? pages : pages), total: out.length, items: out };
}

/** Detalles ope=2 en batch para una lista de SKUs. */
export async function loadFastraxBatchDetailsForSkus(skus) {
  const list = Array.isArray(skus) ? skus.map(s).filter(Boolean) : [];
  if (list.length === 0) return { ok: true, items: [], stats: null };
  const b = await getProductDetailsBatch(list, {
    batchSize: fastraxDetailBatchSize(),
    concurrency: fastraxDetailConcurrency(),
  });
  const items = [];
  for (const sk of list) {
    const raw = b.bySku.get(sk);
    if (!raw) continue;
    const m = mapFastraxRowToProduct(raw);
    if (m) items.push({ ...m, raw_detail: raw, images_count: pickImagesCountFromOpe2(raw) });
  }
  return {
    ok: true,
    items,
    stats: b.stats,
    missing: b.missing,
    failed: b.failed,
  };
}

/**
 * Importa SKUs (resuelve detalles con ope=2 si no se pasaron) y upsert.
 * Devuelve `{ ok, results:[{sku, action, id?, error?}], stats }`.
 */
export async function importFastraxSkusToProducts(skus) {
  const list = Array.isArray(skus) ? [...new Set(skus.map(s).filter(Boolean))] : [];
  if (list.length === 0) return { ok: true, results: [], stats: { inserted: 0, updated: 0, linked: 0, skipped: 0, failed: 0 } };
  const det = await loadFastraxBatchDetailsForSkus(list);
  const bySku = new Map();
  for (const it of det.items) bySku.set(it.fastrax_sku, it);

  const results = [];
  const stats = { inserted: 0, updated: 0, linked: 0, skipped: 0, failed: 0 };

  await withDb(async (client) => {
    const blocked = await getBlockedSkusForFastraxImport(client, list);
    for (const sk of list) {
      if (blocked.has(sk)) {
        results.push({ sku: sk, ok: false, skipped: "blocked_local" });
        stats.skipped += 1;
        continue;
      }
      const m = bySku.get(sk);
      if (!m) {
        results.push({ sku: sk, ok: false, error: "no_detail" });
        stats.failed += 1;
        continue;
      }
      try {
        const r = await upsertFastraxFromRawRow(client, m.raw_detail || m.raw);
        if (r.ok) {
          stats[r.action === "inserted" ? "inserted" : r.action === "linked" ? "linked" : "updated"] += 1;
          results.push({ sku: sk, ok: true, action: r.action, id: r.id });
        } else {
          stats.failed += 1;
          results.push({ sku: sk, ok: false, error: r.error });
        }
      } catch (e) {
        stats.failed += 1;
        results.push({ sku: sk, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
  });

  return { ok: true, results, stats };
}

/** Importa items ya resueltos (sin re-pedir ope=2). */
export async function importFastraxItemsToProducts(items) {
  const list = Array.isArray(items) ? items.filter((x) => x && s(x.sku)) : [];
  const results = [];
  const stats = { inserted: 0, updated: 0, linked: 0, skipped: 0, failed: 0 };
  if (list.length === 0) return { ok: true, results, stats };

  await withDb(async (client) => {
    const blocked = await getBlockedSkusForFastraxImport(client, list.map((x) => s(x.sku)));
    for (const it of list) {
      const sk = s(it.sku);
      if (blocked.has(sk)) {
        results.push({ sku: sk, ok: false, skipped: "blocked_local" });
        stats.skipped += 1;
        continue;
      }
      try {
        const r = await upsertFastraxFromImportItem(client, it);
        if (r.ok) {
          stats[r.action === "inserted" ? "inserted" : r.action === "linked" ? "linked" : "updated"] += 1;
          results.push({ sku: sk, ok: true, action: r.action, id: r.id });
        } else {
          stats.failed += 1;
          results.push({ sku: sk, ok: false, error: r.error });
        }
      } catch (e) {
        stats.failed += 1;
        results.push({ sku: sk, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
  });
  return { ok: true, results, stats };
}

/** Importa todos los SKUs de UNA página ope=4 (resolviendo ope=2 en batch). */
export async function importFastraxPageWithBatch({ page, size } = {}) {
  const pg = Math.max(1, Math.floor(Number(page) || 1));
  const sz = Math.max(1, Math.min(500, Math.floor(Number(size) || fastraxOpe4DefaultPageSize())));
  const r4 = await listFastraxProductsOpe4(pg, sz);
  if (!r4 || !r4.ok) return { ok: false, message: r4?.message || "ope4", parsed: r4?.parsed };
  const rows = extractProductRows(r4._fastrax_data ?? r4.parsed);
  const skus = rows.map(pickSkuFromRow).filter(Boolean);
  if (skus.length === 0) return { ok: true, page: pg, size: sz, total: 0, results: [], stats: null };
  const r = await importFastraxSkusToProducts(skus);
  return { ok: true, page: pg, size: sz, total: skus.length, ...r };
}

/** Importa un rango de páginas ope=4 (cuidado con el volumen). */
export async function importFastraxPageRangeWithBatch({ pageFrom, pageTo, size } = {}) {
  const from = Math.max(1, Math.floor(Number(pageFrom) || 1));
  const to = Math.max(from, Math.floor(Number(pageTo) || from));
  const sz = Math.max(1, Math.min(500, Math.floor(Number(size) || fastraxOpe4DefaultPageSize())));
  const pagesScanned = [];
  const accum = { inserted: 0, updated: 0, linked: 0, skipped: 0, failed: 0 };
  const results = [];
  for (let p = from; p <= to; p += 1) {
    const r = await importFastraxPageWithBatch({ page: p, size: sz });
    pagesScanned.push(p);
    if (!r || !r.ok) {
      return { ok: false, pages_scanned: pagesScanned, message: r?.message, partial: { stats: accum, results } };
    }
    if (r.stats) {
      for (const k of Object.keys(accum)) accum[k] += r.stats[k] || 0;
    }
    if (Array.isArray(r.results)) results.push(...r.results);
    if (r.total === 0) break;
  }
  return { ok: true, pages_scanned: pagesScanned, stats: accum, results };
}
