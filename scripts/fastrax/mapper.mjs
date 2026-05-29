/**
 * Mapeo producto Fastrax → forma normalizada para enertech.products.
 * Adaptado de tradexpar-digital-hub/server/src/integrations/fastrax/mapper.js.
 * Los importes se asumen PYG (enteros, sin decimales).
 */
import crypto from "node:crypto";

const SKU_KEYS = ["sku", "SKU", "codigo", "cod_art", "CodArt", "COD_ART", "articulo", "codigo_articulo", "ref", "Ref"];
const NAME_KEYS = ["nom", "nombre", "name", "titulo", "descripcion", "des"];
const PROMO_PRICE_KEYS = ["precopromo", "promo", "prm", "pre_pro", "prepro", "precio_promo", "promo_pre"];
const PRICE_KEYS = ["pre", "precio", "price", "pvp", "pre_vta"];
const STOCK_KEYS = ["sal", "saldo", "stock", "disponible", "existencia"];
const BRAND_KEYS = ["mar", "marca", "brand"];
const CATEGORY_KEYS = ["caw", "cat", "rubro", "categoria", "cate"];
const IMAGE_KEYS = ["img", "imagen", "image", "foto", "url_img", "urlimg"];
const ACTIVE_KEYS = ["act", "activo", "habilitado", "est", "estado"];
const CRC_KEYS = ["crc", "CRC", "checksum", "hash"];

const PRODUCT_ARRAY_KEYS = ["productos", "datos", "data", "result", "rows", "items", "lista"];

function isPlainObject(x) {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function pickKey(row, keys) {
  if (!isPlainObject(row)) return undefined;
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") return row[k];
  }
  return undefined;
}

function pickStr(row, keys) {
  const v = pickKey(row, keys);
  return v == null ? "" : String(v).trim();
}

/** Fastrax devuelve texto application/x-www-form-urlencoded ("+" = espacio, %XX). */
function urlDecode(s) {
  const t = String(s == null ? "" : s).replace(/\+/g, " ");
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

/**
 * Importe PYG → entero. Fastrax mezcla formatos:
 *  - número JS con decimales (ope=11: pre=158977.5) → redondear (158978).
 *  - string con miles por punto ("1.234.567 Gs") → 1234567.
 *  - string con centavos (".5" / ",50") → se tratan como decimal y se redondea.
 * Borrar el punto a ciegas inflaba el precio 10× (158977.5 → 1589775); por eso este parseo.
 */
function parseAmount(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  let s = String(v).trim().replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  const sign = s.startsWith("-") ? -1 : 1;
  s = s.replace(/-/g, "");
  // El último '.' o ',' es decimal SOLO si lo siguen 1-2 dígitos (centavos);
  // si lo siguen 3, es separador de miles.
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  let normalized;
  if (lastSep !== -1 && /^\d{1,2}$/.test(s.slice(lastSep + 1))) {
    const intDigits = s.slice(0, lastSep).replace(/[.,]/g, "");
    normalized = `${intDigits || "0"}.${s.slice(lastSep + 1)}`;
  } else {
    normalized = s.replace(/[.,]/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(sign * n) : null;
}

function rowLooksLikeProduct(row) {
  return isPlainObject(row) && SKU_KEYS.some((k) => row[k] != null && String(row[k]).trim() !== "");
}

/** Busca recursivamente el array de productos dentro del JSON Fastrax. */
export function extractProductRows(root, depth = 0) {
  if (root == null || depth > 8) return [];
  if (Array.isArray(root)) {
    const products = root.filter(rowLooksLikeProduct);
    if (products.length > 0) return products;
    for (const el of root) {
      const found = extractProductRows(el, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }
  if (isPlainObject(root)) {
    for (const k of PRODUCT_ARRAY_KEYS) {
      if (Array.isArray(root[k])) {
        const found = extractProductRows(root[k], depth + 1);
        if (found.length > 0) return found;
      }
    }
    for (const v of Object.values(root)) {
      const found = extractProductRows(v, depth + 1);
      if (found.length > 0) return found;
    }
  }
  return [];
}

/** SKU normalizado de una fila. */
export function pickSkuFromRow(row) {
  return pickStr(row, SKU_KEYS);
}

/** Slug válido para enertech.products.slug (CHECK ^[a-z0-9]+(?:-[a-z0-9]+)*$). */
export function slugify(input, fallback = "") {
  const COMBINING = new RegExp("[\\u0300-\\u036f]", "g");
  const base = String(input || "")
    .normalize("NFD")
    .replace(COMBINING, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base) return base;
  const fb = String(fallback || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return fb || `fx-${crypto.randomBytes(4).toString("hex")}`;
}

/** Normaliza una fila Fastrax a campos que entiende el sync de Enertech. */
export function mapFastraxRowToProduct(raw) {
  if (!isPlainObject(raw)) return null;
  const sku = pickSkuFromRow(raw);
  if (!sku) return null;

  const name = urlDecode(pickStr(raw, NAME_KEYS)).slice(0, 500) || `Fastrax ${sku}`;

  // Precio promo aplica cuando es > 0; si no, precio estándar.
  const promo = parseAmount(pickKey(raw, PROMO_PRICE_KEYS));
  const std = parseAmount(pickKey(raw, PRICE_KEYS));
  const price = promo != null && promo > 0 ? promo : std;

  const stockNum = parseAmount(pickKey(raw, STOCK_KEYS));
  const stock = stockNum == null ? null : Math.max(0, Math.floor(stockNum));

  const crcFromRow = pickStr(raw, CRC_KEYS);
  const crc = crcFromRow || crypto.createHash("sha1").update(JSON.stringify(raw)).digest("hex");

  // `img` de Fastrax es la CANTIDAD de imágenes (se bajan por ope=3/94), no una URL.
  const imgRaw = pickStr(raw, ["urlimg", "url_img", "imagen_url", "foto_url"]);
  const image = /^(https?:\/\/|\/|.+\.(jpe?g|png|gif|webp|bmp))/i.test(imgRaw) ? imgRaw : null;
  const imageCount = Math.max(0, Math.floor(parseAmount(pickKey(raw, IMAGE_KEYS)) || 0));

  return {
    fastrax_sku: sku,
    name,
    slug: slugify(`${name}-${sku}`, sku),
    price: price == null ? null : Math.max(0, Math.floor(price)),
    stock,
    brand: pickStr(raw, BRAND_KEYS) || null,
    category: pickStr(raw, CATEGORY_KEYS) || null,
    description: urlDecode(pickStr(raw, ["descripcion", "detalle", "description", "des"])) || null,
    image,
    image_count: imageCount,
    active_remote: pickStr(raw, ACTIVE_KEYS) || null,
    crc,
    raw,
  };
}
