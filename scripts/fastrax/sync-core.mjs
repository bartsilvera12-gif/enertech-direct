/**
 * Núcleo de sincronización Fastrax → enertech.products (reusable por CLI y backend HTTP).
 *
 * Flujo en dos pasos (ope=4 es índice liviano: sku + saldo + crc; NO trae nombre/precio,
 * eso vive en ope=2). El crc detecta cambios entre corridas; solo lo nuevo/cambiado pide ope=2.
 *
 * Reglas de seguridad (no negociables):
 *  - Productos NUEVOS entran is_active=false y NO destacados, hasta revisión del admin.
 *  - Productos EXISTENTES: solo se actualiza el snapshot fastrax_* (jamás name/price/stock/is_active curados).
 *  - dryRun por defecto: no escribe.
 *
 * Las funciones devuelven datos (stats/preview/logs) en vez de imprimir, para servir tanto
 * a la CLI como a una respuesta HTTP.
 */
import { listFastraxProductsOpe4, getProductDetails, getStockPrice } from "./client.mjs";
import { extractProductRows, mapFastraxRowToProduct, pickSkuFromRow } from "./mapper.mjs";
import { withDb } from "./db.mjs";

/** ope=4 paginado → índice deduplicado [{ sku, crc, raw }]. */
async function fetchIndex(opts, log) {
  const out = [];
  const seen = new Set();
  let page = opts.page;
  let pages = 0;
  while (pages < opts.maxPages) {
    const r = await listFastraxProductsOpe4(page, opts.size);
    if (!r.ok) throw new Error(`ope=4 page=${page}: ${r.message || r.cestatus || "error"}`);
    const pageRows = extractProductRows(r._fastrax_data ?? r.parsed);
    for (const raw of pageRows) {
      const sku = pickSkuFromRow(raw);
      if (!sku) continue;
      const key = String(sku);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ sku: key, crc: raw.crc != null ? String(raw.crc) : "", raw });
    }
    pages++;
    if (!opts.all) break;
    if (pageRows.length < opts.size) break; // última página
    page++;
  }
  log(`índice ope=4: ${out.length} SKUs únicos`);
  return out;
}

/** ope=2 en lotes → Map<sku, productoMapeado> con nombre/precio/stock reales. */
async function fetchDetails(skus, batch, log) {
  const map = new Map();
  for (let i = 0; i < skus.length; i += batch) {
    const chunk = skus.slice(i, i + batch);
    const r = await getProductDetails(chunk);
    if (!r.ok) {
      log(`[ope=2] lote ${Math.floor(i / batch) + 1}: ${r.message || r.cestatus || "error"}`);
      continue;
    }
    for (const raw of extractProductRows(r._fastrax_data ?? r.parsed)) {
      const m = mapFastraxRowToProduct(raw);
      if (m) map.set(String(m.fastrax_sku), m);
    }
  }
  return map;
}

async function findExisting(client, fastraxSku) {
  let res = await client.query("SELECT id, fastrax_crc FROM products WHERE fastrax_sku = $1 LIMIT 1", [fastraxSku]);
  if (res.rows[0]) return { ...res.rows[0], via: "fastrax_sku" };
  res = await client.query("SELECT id, fastrax_crc FROM products WHERE sku = $1 AND fastrax_sku IS NULL LIMIT 1", [fastraxSku]);
  if (res.rows[0]) return { ...res.rows[0], via: "sku" };
  return null;
}

async function ensureUniqueSlug(client, base) {
  let slug = base;
  for (let n = 2; n < 1000; n++) {
    const res = await client.query("SELECT 1 FROM products WHERE slug = $1 LIMIT 1", [slug]);
    if (res.rowCount === 0) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

function normalizeSyncOpts(opts = {}) {
  const n = (v, d) => {
    const x = Math.floor(Number(v));
    return Number.isFinite(x) ? x : d;
  };
  return {
    page: Math.max(1, n(opts.page, 1)),
    size: Math.max(1, Math.min(500, n(opts.size, 50))),
    all: Boolean(opts.all),
    maxPages: Math.max(1, n(opts.maxPages, 20)),
    apply: Boolean(opts.apply),
    detailBatch: Math.max(1, Math.min(100, n(opts.detailBatch, 20))),
  };
}

/**
 * Sincroniza el catálogo. Devuelve { stats, preview, indexCount, logs }.
 * @param {object} opts page/size/all/maxPages/apply/detailBatch
 * @param {(msg:string)=>void} [onLog]
 */
export async function runProductSync(opts = {}, onLog) {
  const o = normalizeSyncOpts(opts);
  const logs = [];
  const log = (msg) => {
    logs.push(msg);
    if (onLog) onLog(msg);
  };

  const index = await fetchIndex(o, log);
  const stats = { insert: 0, link: 0, update: 0, skip: 0, fail: 0 };
  const preview = [];

  await withDb(async (client) => {
    const plan = [];
    for (const it of index) {
      const existing = await findExisting(client, it.sku);
      if (existing && existing.via === "fastrax_sku" && existing.fastrax_crc && existing.fastrax_crc === it.crc) {
        stats.skip++;
        continue;
      }
      plan.push({ ...it, existing });
    }
    log(`a procesar: ${plan.length} (skip por crc sin cambios: ${stats.skip})`);

    const detailMap = await fetchDetails(plan.map((p) => p.sku), o.detailBatch, log);
    log(`detalles ope=2 obtenidos: ${detailMap.size}/${plan.length}`);

    if (o.apply) await client.query("BEGIN");
    try {
      for (const p of plan) {
        try {
          const d = detailMap.get(p.sku);
          if (!d) {
            stats.fail++;
            log(`[fail] sku=${p.sku}: sin detalle ope=2 (no se inserta/actualiza)`);
            continue;
          }
          const crcToken = p.crc || d.crc;
          if (p.existing) {
            if (p.existing.via === "sku") stats.link++;
            else stats.update++;
            if (o.apply) {
              await client.query(
                `UPDATE products SET
                   fastrax_sku = $2, fastrax_enabled = true, fastrax_raw = $3::jsonb,
                   fastrax_crc = $4, fastrax_last_sync_at = now(),
                   fastrax_stock = $5, fastrax_price = $6
                 WHERE id = $1`,
                [p.existing.id, d.fastrax_sku, JSON.stringify(d.raw), crcToken, d.stock, d.price],
              );
            }
          } else {
            stats.insert++;
            if (preview.length < 25) {
              preview.push({ sku: d.fastrax_sku, name: (d.name || "").slice(0, 60), price: d.price, stock: d.stock });
            }
            if (o.apply) {
              const slug = await ensureUniqueSlug(client, d.slug);
              await client.query(
                `INSERT INTO products
                   (name, slug, sku, description, price, stock, is_active, featured, is_featured,
                    fastrax_sku, fastrax_enabled, fastrax_raw, fastrax_crc, fastrax_last_sync_at,
                    fastrax_stock, fastrax_price)
                 VALUES ($1,$2,$3,$4,$5,0,false,false,false,$6,true,$7::jsonb,$8,now(),$9,$10)`,
                [d.name, slug, d.fastrax_sku, d.description, d.price ?? 0, d.fastrax_sku, JSON.stringify(d.raw), crcToken, d.stock, d.price],
              );
            }
          }
        } catch (e) {
          stats.fail++;
          log(`[fail] sku=${p.sku}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (o.apply) await client.query("COMMIT");
    } catch (e) {
      if (o.apply) await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return { stats, preview, indexCount: index.length, applied: o.apply, logs };
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

/**
 * Sincroniza saldo/precio (ope=11) a las columnas snapshot fastrax_stock/fastrax_price.
 * No toca stock/price curados. Devuelve { stats, logs }.
 * @param {object} opts apply, batch, skus[]
 * @param {(msg:string)=>void} [onLog]
 */
export async function runStockSync(opts = {}, onLog) {
  const apply = Boolean(opts.apply);
  const batch = Math.max(1, Math.min(200, Math.floor(Number(opts.batch) || 50)));
  const explicitSkus = Array.isArray(opts.skus) ? opts.skus.map((s) => String(s).trim()).filter(Boolean) : [];
  const logs = [];
  const log = (msg) => {
    logs.push(msg);
    if (onLog) onLog(msg);
  };

  const stats = { found: 0, updated: 0, missing: 0, fail: 0 };

  await withDb(async (client) => {
    let skus = explicitSkus;
    if (skus.length === 0) {
      const res = await client.query(
        "SELECT fastrax_sku FROM products WHERE fastrax_enabled = true AND fastrax_sku IS NOT NULL",
      );
      skus = res.rows.map((r) => String(r.fastrax_sku));
    }
    if (skus.length === 0) {
      log("no hay SKUs Fastrax para sincronizar.");
      return;
    }
    log(`${skus.length} SKU(s) a consultar`);

    if (apply) await client.query("BEGIN");
    try {
      for (const group of chunk(skus, batch)) {
        const r = await getStockPrice({ sku: group.join(",") });
        if (!r.ok) {
          stats.fail += group.length;
          log(`[fail] batch: ${r.message || r.cestatus || "error"}`);
          continue;
        }
        const rows = extractProductRows(r._fastrax_data ?? r.parsed).map(mapFastraxRowToProduct).filter(Boolean);
        const bySku = new Map(rows.map((m) => [m.fastrax_sku, m]));
        for (const sku of group) {
          const m = bySku.get(sku);
          if (!m) {
            stats.missing++;
            continue;
          }
          stats.found++;
          if (apply) {
            const res = await client.query(
              "UPDATE products SET fastrax_stock = $2, fastrax_price = $3, fastrax_last_sync_at = now() WHERE fastrax_sku = $1",
              [sku, m.stock, m.price],
            );
            stats.updated += res.rowCount || 0;
          }
        }
      }
      if (apply) await client.query("COMMIT");
    } catch (e) {
      if (apply) await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return { stats, applied: apply, logs };
}
