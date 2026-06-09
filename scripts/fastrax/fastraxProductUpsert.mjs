/**
 * Upsert de productos Fastrax → enertech.products (modelo external_*).
 *
 * Reglas:
 *  - UPSERT por (external_provider, external_product_id). Si no existe, se inserta
 *    con is_active=false e is_featured=false (no se publica sin revisión admin).
 *  - Si existe: solo se actualizan los campos external_* + snapshot Fastrax;
 *    name/price/stock/is_active "curados" se preservan. Esto evita pisar la
 *    edición manual del admin.
 *  - Si la fila local no tiene fila externa (matching por sku curado), se
 *    "vincula" agregando external_* sin tocar el resto. Devuelve action='linked'.
 *
 * Requiere migración `17_fastrax_external_phase2.sql` aplicada para las columnas
 * external_* y product_source_type. El INSERT es resiliente: introspecta las
 * columnas reales de `enertech.products` al primer uso y filtra el payload —
 * si una columna opcional no existe en este entorno, simplemente no se inserta.
 */
import crypto from "node:crypto";
import { FASTRAX_SOURCE, mapFastraxRowToProduct, slugify } from "./mapper.mjs";
import { saveLocalFastraxProductImagesIfNeeded } from "./localFastraxImage.mjs";
import { formatFastraxDescription } from "./fastraxDescriptionFormatter.mjs";

function str(v) {
  if (v == null) return "";
  return String(v).trim();
}
function numV(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

async function ensureUniqueSlug(client, base) {
  let slug = base;
  for (let n = 2; n < 1000; n += 1) {
    const r = await client.query("SELECT 1 FROM products WHERE slug = $1 LIMIT 1", [slug]);
    if (r.rowCount === 0) return slug;
    slug = `${base}-${n}`;
  }
  return `${base}-${crypto.randomBytes(2).toString("hex")}`;
}

/**
 * ¿Es el string un "ID-like" que Fastrax suele devolver como categoría?
 * Cubre: "12", "150", "24,23,206", "12.345", "1-2-3", "12 34". Cualquier cosa
 * compuesta solo por dígitos / separadores se descarta como nombre.
 */
function looksLikeNumericId(s) {
  const t = String(s ?? "").trim();
  if (!t) return true;
  return /^[\d,.\-\s/]+$/.test(t);
}

/**
 * Deriva un nombre de categoría a partir del nombre del producto.
 *  - "UPS FTX 220V..."   → "UPS"
 *  - "TONER HP 05A..."   → "TONER"
 *  - "1000VA UPS..."     → "UPS" (saltea tokens que parecen códigos/medidas)
 * Si no encuentra ningún token alfabético razonable, devuelve null.
 */
function deriveCategoryFromName(rawName) {
  const t = String(rawName ?? "").trim();
  if (!t) return null;
  // Tokens separados por espacio o por símbolos típicos de SKU/medidas.
  const tokens = t.split(/[\s/_\-–—]+/u).filter(Boolean);
  for (const tok of tokens) {
    // Solo letras (incluye acentos). Descarta "1000VA", "220V", "FTXO1000".
    if (/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}$/.test(tok)) {
      return tok.toUpperCase();
    }
  }
  return null;
}

/**
 * Devuelve el UUID de una categoría top-level cuyo nombre coincide (case-insensitive).
 * Si no existe, la crea como categoría principal (parent_id NULL, is_active=true).
 *
 * Orden de preferencia para el nombre:
 *  1. `rawName` (de Fastrax) si no es vacío ni un ID numérico.
 *  2. Primer token alfabético del nombre del producto (ej. "UPS", "TONER").
 *  3. "Fastrax" como último recurso.
 */
async function ensureCategoryByName(client, rawName, productName = "") {
  const fastraxName = !looksLikeNumericId(rawName) ? String(rawName).trim() : "";
  const derived = fastraxName ? "" : deriveCategoryFromName(productName) || "";
  const name = fastraxName || derived || "Fastrax";
  // Buscar top-level por nombre (case-insensitive, trim).
  const found = await client.query(
    `SELECT id FROM categories
      WHERE lower(trim(name)) = lower(trim($1))
        AND parent_id IS NULL
      LIMIT 1`,
    [name],
  );
  if (found.rows[0]?.id) return found.rows[0].id;

  // No existe → crearla (resiliente a colisiones de slug por UNIQUE).
  const baseSlug = slugify(name) || "categoria";
  for (let i = 0; i < 300; i += 1) {
    const slug = i === 0 ? baseSlug : `${baseSlug}-${i}`;
    try {
      const r = await client.query(
        `INSERT INTO categories (name, slug, parent_id, is_active, sort_order)
         VALUES ($1, $2, NULL, true, 0)
         RETURNING id`,
        [name, slug],
      );
      console.info(`[fastrax/upsert] categoría auto-creada: "${name}" (slug=${slug})`);
      return r.rows[0].id;
    } catch (e) {
      if (e && e.code === "23505") continue; // colisión de slug → próximo
      throw e;
    }
  }
  throw new Error(`No se pudo crear categoría "${name}" (slug agotado).`);
}

/**
 * Cache de columnas reales de `enertech.products`. Cuando el caller hace upsert
 * por primera vez, leemos `information_schema.columns` y guardamos el set; el
 * resto del proceso reusa esa lectura sin volver a pegarle a la DB.
 */
let PRODUCT_COLUMNS_CACHE = null;
export async function getProductColumns(client) {
  if (PRODUCT_COLUMNS_CACHE) return PRODUCT_COLUMNS_CACHE;
  const r = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'enertech' AND table_name = 'products'",
  );
  PRODUCT_COLUMNS_CACHE = new Set(r.rows.map((row) => row.column_name));
  return PRODUCT_COLUMNS_CACHE;
}

/** Para tests: permite resetear el cache (no usar en producción). */
export function _resetProductColumnsCache() {
  PRODUCT_COLUMNS_CACHE = null;
}

/** Columnas que SQL 17 introduce; usado para mensajes de error precisos. */
const SQL_17_COLUMNS = new Set([
  "product_source_type",
  "external_provider",
  "external_product_id",
  "external_sku",
  "external_payload",
  "external_sync_crc",
  "external_last_sync_at",
  "external_active",
  "external_image_url",
  "external_images",
  "external_brand",
  "external_category",
]);

function describeKnownError(err) {
  const msg = err && err.message ? String(err.message) : String(err);
  if (/products_source_type_chk/i.test(msg)) {
    return "BD bloquea product_source_type='fastrax' (constraint products_source_type_chk). Aplicá supabase/sql/17_fastrax_external_phase2.sql.";
  }
  // Detecta "column "X" of relation "products" does not exist" / "no existe la columna «X»"
  const colMatch =
    /column "([^"]+)" of relation .*does not exist/i.exec(msg) ||
    /column "([^"]+)" does not exist/i.exec(msg) ||
    /no existe la columna [«"]([^»"]+)[»"]/i.exec(msg);
  if (colMatch) {
    const col = colMatch[1];
    if (SQL_17_COLUMNS.has(col)) {
      return `Columna '${col}' ausente. Aplicá supabase/sql/17_fastrax_external_phase2.sql.`;
    }
    return `Columna '${col}' no existe en enertech.products. Revisar mapeo del upsert (no requiere SQL 17).`;
  }
  return msg;
}

/**
 * Construye un INSERT parametrizado a partir de un mapa { col: value }, filtrando
 * por columnas presentes en `allowedCols`. Valores que son objetos/arrays se
 * serializan como JSON y se castean a `::jsonb` en el SQL. `'__NOW__'` marca un
 * valor que debe ser `now()` (sin parametrizar, se usa expresión SQL).
 */
function buildParameterizedInsert(tableName, allowedCols, payload, returningCol) {
  const cols = [];
  const placeholders = [];
  const vals = [];
  let i = 1;
  for (const [k, v] of Object.entries(payload)) {
    if (!allowedCols.has(k)) continue;
    cols.push(k);
    if (v === "__NOW__") {
      placeholders.push("now()");
      continue;
    }
    if (v !== null && typeof v === "object" && !(v instanceof Date)) {
      placeholders.push(`$${i}::jsonb`);
      vals.push(JSON.stringify(v));
    } else {
      placeholders.push(`$${i}`);
      vals.push(v);
    }
    i += 1;
  }
  const sql = `INSERT INTO ${tableName} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})${
    returningCol ? ` RETURNING ${returningCol}` : ""
  }`;
  return { sql, values: vals, columns: cols };
}

/** Devuelve { ok, action, id?, error? }. */
export async function upsertFastraxMappedRow(client, m) {
  const now = new Date().toISOString();
  const rawPayload = m && m.raw && typeof m.raw === "object" && !Array.isArray(m.raw) ? m.raw : null;

  // Imágenes (best-effort, no bloquea si falla).
  let mainImage = null;
  let gallery = [];
  try {
    const r = await saveLocalFastraxProductImagesIfNeeded(m.fastrax_sku, rawPayload);
    mainImage = r.mainImage || null;
    gallery = Array.isArray(r.gallery) ? r.gallery : [];
  } catch (e) {
    console.warn(`[fastrax/upsert] images sku=${m.fastrax_sku}: ${e instanceof Error ? e.message : e}`);
  }

  const formattedDesc =
    formatFastraxDescription(
      rawPayload?.des ?? rawPayload?.descripcion ?? m.description ?? "",
      rawPayload?.bre ?? "",
    ) || m.description || m.name;

  const sku = m.fastrax_sku;
  const externalActive = (m.price ?? 0) > 0 && (m.stock ?? 0) >= 0;

  // 1) ¿Ya existe vinculado por (external_provider, external_product_id)?
  let existing = null;
  try {
    const r = await client.query(
      `SELECT id, product_source_type FROM products
        WHERE external_provider = $1 AND external_product_id = $2
        LIMIT 1`,
      [FASTRAX_SOURCE, sku],
    );
    existing = r.rows[0] || null;
  } catch (e) {
    return { ok: false, error: describeKnownError(e) };
  }

  // 2) Si no, ¿existe una fila curada con `fastrax_sku` o `sku` que matchee?
  //    Sólo se "vincula" (set external_*), no se reescribe nada curado.
  let linkCandidate = null;
  if (!existing) {
    try {
      const r = await client.query(
        `SELECT id, product_source_type FROM products
          WHERE (fastrax_sku = $1 OR (sku = $1 AND fastrax_sku IS NULL))
            AND (external_provider IS NULL OR external_provider = '')
          LIMIT 1`,
        [sku],
      );
      linkCandidate = r.rows[0] || null;
    } catch (_e) {
      // Ignorar: fastrax_sku puede no existir en algún entorno; seguimos.
    }
  }

  const params = {
    fastrax_sku: sku,
    name: m.name,
    description: formattedDesc,
    price: m.price ?? 0,
    stock: m.stock ?? 0,
    brand: m.brand || null,
    category: m.category || null,
    external_provider: FASTRAX_SOURCE,
    external_product_id: sku,
    external_sku: sku,
    external_payload: rawPayload,
    external_sync_crc: m.crc || null,
    external_last_sync_at: now,
    external_active: externalActive,
    external_image_url: mainImage,
    external_images: gallery.length > 0 ? gallery : null,
    external_brand: m.brand || null,
    external_category: m.category || null,
    fastrax_raw: rawPayload, // mantener compat con 16
    fastrax_crc: m.crc || null,
    fastrax_price: m.price ?? null,
    fastrax_stock: m.stock ?? null,
  };

  if (existing) {
    // UPDATE: solo refresca external_* + snapshot fastrax_* (no toca curado).
    try {
      await client.query(
        `UPDATE products SET
            external_provider     = $1,
            external_product_id   = $2,
            external_sku          = $3,
            external_payload      = $4::jsonb,
            external_sync_crc     = $5,
            external_last_sync_at = now(),
            external_active       = $6,
            external_image_url    = COALESCE($7, external_image_url),
            external_images       = COALESCE($8::jsonb, external_images),
            external_brand        = COALESCE($9, external_brand),
            external_category     = COALESCE($10, external_category),
            fastrax_sku           = $3,
            fastrax_enabled       = true,
            fastrax_raw           = $4::jsonb,
            fastrax_crc           = $5,
            fastrax_last_sync_at  = now(),
            fastrax_price         = $11,
            fastrax_stock         = $12,
            updated_at            = now()
          WHERE id = $13`,
        [
          params.external_provider,
          params.external_product_id,
          params.external_sku,
          params.external_payload ? JSON.stringify(params.external_payload) : null,
          params.external_sync_crc,
          params.external_active,
          params.external_image_url,
          params.external_images ? JSON.stringify(params.external_images) : null,
          params.external_brand,
          params.external_category,
          params.fastrax_price,
          params.fastrax_stock,
          existing.id,
        ],
      );
      return { ok: true, action: "updated", id: existing.id };
    } catch (e) {
      return { ok: false, error: describeKnownError(e) };
    }
  }

  if (linkCandidate) {
    // LINK: agrega external_* a una fila curada existente sin reescribir nada.
    try {
      await client.query(
        `UPDATE products SET
            product_source_type   = COALESCE(product_source_type, 'enertech'),
            external_provider     = $1,
            external_product_id   = $2,
            external_sku          = $3,
            external_payload      = $4::jsonb,
            external_sync_crc     = $5,
            external_last_sync_at = now(),
            external_active       = $6,
            external_image_url    = COALESCE(external_image_url, $7),
            external_images       = COALESCE(external_images, $8::jsonb),
            external_brand        = COALESCE(external_brand, $9),
            external_category     = COALESCE(external_category, $10),
            fastrax_sku           = COALESCE(fastrax_sku, $3),
            fastrax_enabled       = true,
            fastrax_raw           = $4::jsonb,
            fastrax_crc           = $5,
            fastrax_last_sync_at  = now(),
            fastrax_price         = $11,
            fastrax_stock         = $12,
            updated_at            = now()
          WHERE id = $13`,
        [
          params.external_provider,
          params.external_product_id,
          params.external_sku,
          params.external_payload ? JSON.stringify(params.external_payload) : null,
          params.external_sync_crc,
          params.external_active,
          params.external_image_url,
          params.external_images ? JSON.stringify(params.external_images) : null,
          params.external_brand,
          params.external_category,
          params.fastrax_price,
          params.fastrax_stock,
          linkCandidate.id,
        ],
      );
      return { ok: true, action: "linked", id: linkCandidate.id };
    } catch (e) {
      return { ok: false, error: describeKnownError(e) };
    }
  }

  // INSERT nuevo. is_active=false, is_featured=false → no publicado.
  // Construcción dinámica: filtra por columnas reales de enertech.products
  // (introspección cacheada). Si alguna columna opcional no existe en este
  // entorno, simplemente se omite — no rompe el INSERT.
  try {
    const slug = await ensureUniqueSlug(client, slugify(`${m.name}-${sku}`, sku));
    const allowedCols = await getProductColumns(client);

    // Resolver categoría: usar el nombre que viene de Fastrax o "Fastrax" como
    // fallback. Si la categoría no existe en enertech.categories, se crea.
    let resolvedCategoryId = null;
    try {
      // Pasamos el nombre del producto para que ensureCategoryByName pueda
      // derivar "UPS"/"TONER"/etc. si Fastrax no manda categoría textual.
      resolvedCategoryId = await ensureCategoryByName(client, params.category, m.name);
    } catch (e) {
      console.warn(`[fastrax/upsert] no se pudo resolver categoría para sku=${sku}: ${e instanceof Error ? e.message : e}`);
    }

    const candidate = {
      // Campos curados base — solo se setean en el INSERT (creación nueva).
      name: params.name,
      slug,
      sku,
      description: formattedDesc,
      price: params.price,
      // Stock real de Fastrax. Antes estaba hardcodeado a 0; eso hacía que la
      // ficha del admin mostrara "sin stock" hasta editar manualmente.
      stock: params.stock ?? 0,
      is_active: false,
      is_featured: false,
      category_id: resolvedCategoryId,
      // Source type para distinguir filas Fastrax de las curadas.
      product_source_type: FASTRAX_SOURCE,
      // Capa external_* (SQL 17).
      external_provider: params.external_provider,
      external_product_id: params.external_product_id,
      external_sku: params.external_sku,
      external_payload: params.external_payload, // se serializa a jsonb por buildParameterizedInsert
      external_sync_crc: params.external_sync_crc,
      external_last_sync_at: "__NOW__",
      external_active: params.external_active,
      external_image_url: params.external_image_url,
      external_images: params.external_images, // array → jsonb
      external_brand: params.external_brand,
      external_category: params.external_category,
      // Snapshot legacy (SQL 16). Mantenido por compat hacia atrás.
      fastrax_sku: params.external_sku,
      fastrax_enabled: true,
      fastrax_raw: params.external_payload,
      fastrax_crc: params.external_sync_crc,
      fastrax_last_sync_at: "__NOW__",
      fastrax_price: params.fastrax_price,
      fastrax_stock: params.fastrax_stock,
    };

    const { sql, values, columns } = buildParameterizedInsert("products", allowedCols, candidate, "id");
    // Si por alguna razón faltan TODAS las columnas externas, abortar.
    if (!columns.includes("external_provider") && !columns.includes("fastrax_sku")) {
      return { ok: false, error: "products no tiene columnas Fastrax/external_*. Aplicá supabase/sql/17_fastrax_external_phase2.sql." };
    }
    const r = await client.query(sql, values);
    return { ok: true, action: "inserted", id: r.rows[0]?.id };
  } catch (e) {
    return { ok: false, error: describeKnownError(e) };
  }
}

/** Importar desde el buscador (no requiere re-pedir ope=2). */
export async function upsertFastraxFromImportItem(client, item) {
  const sku = str(item?.sku);
  if (!sku) return { ok: false, error: "sku requerido" };
  const rawDetail = item && item.raw_detail && typeof item.raw_detail === "object" && !Array.isArray(item.raw_detail)
    ? item.raw_detail
    : {};
  if (Object.prototype.hasOwnProperty.call(rawDetail, "_ope2_error")) {
    return { ok: false, error: "raw_detail ope2 inválido" };
  }
  const name = str(item.name) || `Fastrax ${sku}`;
  const price = Math.max(0, Math.floor(numV(item.price)));
  const stock = Math.max(0, Math.floor(numV(item.stock)));
  const m = {
    fastrax_sku: sku,
    name,
    slug: slugify(`${name}-${sku}`, sku),
    price,
    stock,
    brand: str(rawDetail.mar ?? rawDetail.Mar ?? rawDetail.marca) || null,
    // Misma lógica que mapper.mjs: priorizar campos textuales y descartar IDs
    // numéricos (incluyendo "24,23,206"). Si todo lo encontrado es numérico,
    // ensureCategoryByName deriva del nombre del producto o aplica "Fastrax".
    category: (() => {
      const candidates = [rawDetail.categoria, rawDetail.cate, rawDetail.caw, rawDetail.cat, rawDetail.rubro];
      for (const c of candidates) {
        const s = str(c);
        if (s && !looksLikeNumericId(s)) return s;
      }
      return null;
    })(),
    description: str(rawDetail.des ?? rawDetail.descripcion ?? rawDetail.bre) || null,
    image: null,
    image_count: 0,
    active_remote: null,
    crc: rawDetail.crc != null && String(rawDetail.crc).trim()
      ? String(rawDetail.crc).trim()
      : crypto.createHash("sha1").update(JSON.stringify(rawDetail)).digest("hex"),
    raw: rawDetail,
  };
  return upsertFastraxMappedRow(client, m);
}

export async function upsertFastraxFromRawRow(client, raw) {
  const m = mapFastraxRowToProduct(raw);
  if (!m) return { ok: false, error: "Sin SKU reconocible en fila Fastrax" };
  return upsertFastraxMappedRow(client, m);
}
