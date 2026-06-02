/**
 * Persiste imágenes ope=3 en disco y devuelve URLs públicas servidas por el
 * backend Node bajo `/fastrax-products/{SKU}-{idx}.jpg`.
 *
 * - `saveLocalFastraxProductImagesIfNeeded(sku, rawDetail)` descarga todas las
 *   imágenes informadas en `rawDetail.img` (1..N, capped a `FASTRAX_IMAGE_MAX_PER_PRODUCT`,
 *   default 10) y devuelve `{ mainImage, gallery[] }`.
 * - `saveLocalFastraxProductImageIfNeeded(sku, rawDetail)` legacy: devuelve solo
 *   `mainImage`.
 *
 * Compatibilidad: si existe el legacy `{SKU}.jpg` (sin índice), se copia a
 * `{SKU}-1.jpg` antes del primer pase para no redescargar.
 *
 * Adaptado de tradexpar-digital-hub/server/src/integrations/fastrax/localFastraxImage.js.
 */
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFastraxImageOpe3, fastraxImageMaxPerProduct } from "./client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Raíz del backend: `<repo>/server/`. Este archivo vive en `<repo>/scripts/fastrax/`. */
const SERVER_ROOT = path.resolve(__dirname, "..", "..", "server");
export const FASTRAX_LOCAL_IMAGE_DIR = path.join(SERVER_ROOT, "public", "fastrax-products");
export const FASTRAX_LOCAL_IMAGE_PUBLIC_PREFIX = "/fastrax-products";

function numF(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Lee `raw_detail.img` como cantidad de imágenes (no URL). */
function fastraxImageCountFromRaw(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return 0;
  const v = row.img ?? row.Img;
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  const t = String(v).trim();
  if (!t) return 0;
  if (/^-?\d+([.,]\d+)?$/.test(t)) return Math.max(0, Math.floor(numF(t)));
  return 1;
}

function safeSkuFileBase(sku) {
  const s = String(sku).trim();
  if (!s) return "";
  const base = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "_").slice(0, 200);
  return base || "sku";
}

async function fileExists(absPath) {
  try {
    await fsPromises.access(absPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function migrateLegacyFirstImage(fileBase) {
  const legacyAbs = path.join(FASTRAX_LOCAL_IMAGE_DIR, `${fileBase}.jpg`);
  const numberedAbs = path.join(FASTRAX_LOCAL_IMAGE_DIR, `${fileBase}-1.jpg`);
  if (await fileExists(numberedAbs)) return true;
  if (!(await fileExists(legacyAbs))) return false;
  try {
    await fsPromises.copyFile(legacyAbs, numberedAbs);
    return true;
  } catch {
    return false;
  }
}

async function fetchImageBufferDirect(sku, idx) {
  const r = await getFastraxImageOpe3(sku, idx);
  if (!r || !r.ok || !r.body || !Buffer.isBuffer(r.body)) return null;
  return r.body;
}

async function ensureSingleImage(sSku, fileBase, idx) {
  const fileName = `${fileBase}-${idx}.jpg`;
  const absPath = path.join(FASTRAX_LOCAL_IMAGE_DIR, fileName);
  const publicPath = `${FASTRAX_LOCAL_IMAGE_PUBLIC_PREFIX}/${fileName}`;

  if (await fileExists(absPath)) return publicPath;

  const buf = await fetchImageBufferDirect(sSku, idx);
  if (!buf || !buf.length) return null;
  try {
    await fsPromises.mkdir(FASTRAX_LOCAL_IMAGE_DIR, { recursive: true });
    await fsPromises.writeFile(absPath, buf, { flag: "wx" });
  } catch (e) {
    if (e && e.code === "EEXIST") return publicPath;
    return null;
  }
  return publicPath;
}

/** Descarga todas las imágenes; devuelve { mainImage, gallery }. */
export async function saveLocalFastraxProductImagesIfNeeded(sku, rawDetail) {
  const sSku = String(sku ?? "").trim();
  if (!sSku) return { mainImage: null, gallery: [] };
  const reportedRaw = fastraxImageCountFromRaw(rawDetail);
  if (reportedRaw <= 0) return { mainImage: null, gallery: [] };
  const reported = Math.min(reportedRaw, fastraxImageMaxPerProduct());

  const fileBase = safeSkuFileBase(sSku);
  await migrateLegacyFirstImage(fileBase);

  const gallery = [];
  let saved = 0;
  let failed = 0;
  for (let idx = 1; idx <= reported; idx += 1) {
    const url = await ensureSingleImage(sSku, fileBase, idx);
    if (url) {
      gallery.push(url);
      saved += 1;
    } else {
      failed += 1;
      if (idx === 1) break; // si la 1 falla, no insistir
      console.warn(`[fastrax/image] sku=${sSku} miss idx=${idx} (sigo con las siguientes)`);
    }
  }

  console.info(
    `[fastrax/image] sku=${sSku} expected=${reported}${
      reportedRaw !== reported ? ` (capped from ${reportedRaw})` : ""
    } saved=${saved} failed=${failed}`,
  );

  if (gallery.length === 0) return { mainImage: null, gallery: [] };
  return { mainImage: gallery[0], gallery };
}

/** Legacy: solo devuelve la imagen principal. */
export async function saveLocalFastraxProductImageIfNeeded(sku, rawDetail) {
  const r = await saveLocalFastraxProductImagesIfNeeded(sku, rawDetail);
  return r.mainImage;
}
