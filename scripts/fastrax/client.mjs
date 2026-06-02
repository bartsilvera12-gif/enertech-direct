/**
 * Cliente Fastrax server-side (POST application/x-www-form-urlencoded, estilo PHP).
 * Credenciales SOLO server-side: FASTRAX_API_URL, FASTRAX_COD, FASTRAX_PASS (.env.local).
 * Tras HTTP 2xx se aplica la comprobación de negocio (estatus/cestatus) de fastraxResponse.mjs.
 * Adaptado de tradexpar-digital-hub/server/src/integrations/fastrax/client.js (sin Express).
 */
import https from "node:https";
import { URL } from "node:url";
import { loadFastraxEnv } from "./env.mjs";
import { withFastraxBusinessGate, logFastraxOpe } from "./fastraxResponse.mjs";
import { extractProductRows, pickSkuFromRow } from "./mapper.mjs";

loadFastraxEnv();

const FASTRAX_DETAIL_BATCH_DEFAULT = 20;
const FASTRAX_DETAIL_BATCH_MAX = 50;
const FASTRAX_DETAIL_CONCURRENCY_DEFAULT = 2;
const FASTRAX_DETAIL_CONCURRENCY_MAX = 4;

export function fastraxDetailBatchSize() {
  const raw = Number(envTrim("FASTRAX_DETAIL_BATCH_SIZE") || FASTRAX_DETAIL_BATCH_DEFAULT) || FASTRAX_DETAIL_BATCH_DEFAULT;
  return Math.max(1, Math.min(FASTRAX_DETAIL_BATCH_MAX, Math.floor(raw)));
}

export function fastraxDetailConcurrency() {
  const raw = Number(envTrim("FASTRAX_DETAIL_CONCURRENCY") || FASTRAX_DETAIL_CONCURRENCY_DEFAULT) || FASTRAX_DETAIL_CONCURRENCY_DEFAULT;
  return Math.max(1, Math.min(FASTRAX_DETAIL_CONCURRENCY_MAX, Math.floor(raw)));
}

export function fastraxOpe4DefaultPageSize() {
  const raw = Number(envTrim("FASTRAX_OPE4_DEFAULT_PAGE_SIZE") || envTrim("FASTRAX_OPE4_PAGE_SIZE") || 50) || 50;
  return Math.max(1, Math.min(500, Math.floor(raw)));
}

export function fastraxImageMaxPerProduct() {
  const raw = Number(envTrim("FASTRAX_IMAGE_MAX_PER_PRODUCT") || 10) || 10;
  return Math.max(1, Math.min(50, Math.floor(raw)));
}

function envTrim(key) {
  const v = process.env[key];
  return v == null ? "" : String(v).trim();
}

export function fastraxEnabled() {
  return String(process.env.FASTRAX_ENABLED ?? "1").trim() !== "0";
}

export function fastraxConfigured() {
  if (!fastraxEnabled()) return false;
  return Boolean(envTrim("FASTRAX_API_URL") && envTrim("FASTRAX_COD") && envTrim("FASTRAX_PASS"));
}

function sslInsecure() {
  return String(process.env.FASTRAX_SSL_INSECURE ?? "0").trim() === "1";
}

export function getFastraxCreds() {
  return {
    url: envTrim("FASTRAX_API_URL").replace(/\/+$/, ""),
    cod: envTrim("FASTRAX_COD"),
    pas: envTrim("FASTRAX_PASS"),
  };
}

/** pgt de pedido: FASTRAX_PGT o 3 (Otros). */
export function fastraxPgt() {
  const n = Math.floor(Number(envTrim("FASTRAX_PGT") || 3));
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function fastraxTimeoutMs() {
  return Math.min(180_000, Math.max(5_000, Number(process.env.FASTRAX_REQUEST_TIMEOUT_MS || 90_000) || 90_000));
}

const FORM_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json,text/plain,*/*",
};

function buildFormParams(ope, extra) {
  const { cod, pas } = getFastraxCreds();
  const params = { ope, cod: String(cod), pas: String(pas), ...(extra && typeof extra === "object" ? extra : {}) };
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) body.append(key, String(value));
  }
  return body;
}

function fastraxPostHttps(baseUrl, body, timeoutMs, tls) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(baseUrl);
    } catch {
      resolve({ ok: false, status: 0, message: "URL Fastrax inválida", parsed: null });
      return;
    }
    const options = {
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method: "POST",
      headers: { ...FORM_HEADERS, "Content-Length": Buffer.byteLength(body, "utf8") },
      rejectUnauthorized: tls.rejectUnauthorized,
    };
    const req = https.request(options, (r) => {
      const chunks = [];
      r.on("data", (c) => chunks.push(c));
      r.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let parsed;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          parsed = { _raw: text.slice(0, 8_000) };
        }
        if (r.statusCode < 200 || r.statusCode >= 300) {
          resolve({ ok: false, status: r.statusCode || 0, message: `HTTP ${r.statusCode}`, parsed, raw: text });
        } else {
          resolve({ ok: true, status: r.statusCode || 200, parsed, raw: text });
        }
      });
    });
    const timer = setTimeout(() => {
      req.destroy();
      resolve({ ok: false, status: 0, message: "Fastrax request timeout", parsed: null });
    }, timeoutMs);
    req.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, status: 0, message: e instanceof Error ? e.message : String(e), parsed: null });
    });
    req.write(body);
    req.end();
    req.on("close", () => clearTimeout(timer));
  });
}

/** POST genérico. Devuelve { ok, status, parsed, message?, businessOk?, _fastrax_data? }. */
export async function fastraxPost(ope, extra = {}) {
  if (!fastraxConfigured()) {
    return { ok: false, status: 0, message: "Fastrax no configurado (FASTRAX_* en .env.local).", parsed: null };
  }
  const { url: baseUrl } = getFastraxCreds();
  if (!baseUrl) return { ok: false, status: 0, message: "FASTRAX_API_URL vacía", parsed: null };

  const bodyStr = buildFormParams(ope, extra).toString();
  const timeoutMs = fastraxTimeoutMs();
  logFastraxOpe(ope);

  let r;
  if (sslInsecure()) {
    r = await fastraxPostHttps(baseUrl, bodyStr, timeoutMs, { rejectUnauthorized: false });
  } else {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(baseUrl, { method: "POST", headers: { ...FORM_HEADERS }, body: bodyStr, signal: controller.signal });
    } catch (e) {
      clearTimeout(t);
      return { ok: false, status: 0, message: e instanceof Error ? e.message : String(e), parsed: null };
    } finally {
      clearTimeout(t);
    }
    const text = await res.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { _raw: text?.slice(0, 8_000) || "" };
    }
    r = res.ok
      ? { ok: true, status: res.status, parsed, raw: text }
      : { ok: false, status: res.status, message: `HTTP ${res.status}`, parsed };
  }
  if (!r.ok) return r;
  return withFastraxBusinessGate(r, { ope });
}

// ---- Operaciones ----
/** ope=10: versión / health check. */
export const getVersion = () => fastraxPost(10, {});

/** ope=4: listado paginado (parámetros tam/pag configurables por env). */
export function listFastraxProductsOpe4(page = 1, size = 50) {
  const pagKey = envTrim("FASTRAX_OPE4_PAGE_PARAM") || "pag";
  const tamKey = envTrim("FASTRAX_OPE4_SIZE_PARAM") || "tam";
  const tam = Math.max(1, Math.min(500, Math.floor(Number(size) || 50)));
  const p = Math.max(1, Math.floor(Number(page) || 1));
  return fastraxPost(4, { [tamKey]: tam, [pagKey]: p });
}

/** ope=2: detalle por SKU(s). Acepta string/número/array (se unen con coma). */
export function getProductDetails(skus) {
  let normalized = "";
  if (Array.isArray(skus)) {
    normalized = skus.map((x) => (x == null ? "" : String(x).trim())).filter(Boolean).join(",");
  } else if (skus != null) {
    normalized = String(skus).trim();
  }
  if (!normalized) return Promise.resolve({ ok: false, status: 0, message: "Fastrax ope=2: sku requerido", parsed: null });
  return fastraxPost(2, { sku: normalized });
}

/** ope=11: saldo / precio / activo. */
export const getStockPrice = (extra = {}) => fastraxPost(11, extra);

/** ope=12: enviar pedido. payload: { ped, sku, gra, qtd, pgt } (cliente añade cod/pas/ope). */
export const createFastraxRemoteOrder12 = (payload) =>
  fastraxPost(12, payload && typeof payload === "object" ? payload : {});

/** ope=13: estado de pedido (por pdc o ped). */
export const queryFastraxOrderStatus13 = (queryBody) =>
  fastraxPost(13, queryBody && typeof queryBody === "object" ? queryBody : {});

/** ope=15: facturar (SOLO si FASTRAX_AUTO_INVOICE=1; lo controla el caller). */
export const fastraxInvoiceOrder15 = (invoiceBody) =>
  fastraxPost(15, invoiceBody && typeof invoiceBody === "object" ? invoiceBody : {});

// ============================================================================
// ope=3: descarga binaria de imagen del producto.
// ============================================================================
/**
 * Devuelve el `Content-Type` real para una imagen Fastrax (ope=3).
 * Prioridad: magic bytes del buffer > header HTTP. Fastrax suele declarar
 * `image/jpeg` aunque el cuerpo sea PNG/GIF/etc.; preferir los magic bytes
 * evita que el frontend reciba un mime mentiroso (que puede romper detección
 * por extensión o cache de CDN). Fallback al header si no se reconoce el
 * magic, y a `application/octet-stream` si no hay header tampoco.
 */
function sniffOrPickImageContentType(buf, headerContentType) {
  const h = (headerContentType || "").split(";")[0].trim().toLowerCase();
  if (buf && buf.length >= 4) {
    if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
    if (buf[0] === 0x42 && buf[1] === 0x4d) return "image/bmp";
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) return "image/webp";
  }
  if (h && h.startsWith("image/")) return h;
  return h || "application/octet-stream";
}

function strErr(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** Si el body de ope=3 es JSON/error, devuelve un mensaje legible; si no, null. */
function tryFastraxImageErrorMessage(buf, contentType) {
  const ct = (contentType || "").toLowerCase();
  if (!ct.includes("json") && !ct.startsWith("text/")) {
    if (buf.length < 2 || (buf[0] !== 0x7b && buf[0] !== 0x5b)) return null;
  }
  const t = buf.length > 64 * 1024 ? buf.toString("utf8", 0, 64 * 1024) : buf.toString("utf8");
  const trim = t.trim();
  if (!trim || (trim[0] !== "{" && trim[0] !== "[")) return null;
  try {
    const j = JSON.parse(t);
    if (j == null || typeof j !== "object" || Array.isArray(j)) return "Respuesta ope3 no es imagen";
    const o = j;
    if (o.message != null && strErr(o.message)) return strErr(o.message);
    const rawE = o.estatus ?? o.Estatus;
    if (rawE == null) return "Respuesta ope3 no es imagen";
    const n = Number(rawE);
    if (Number.isFinite(n) && n === 0) return null;
    if (Number.isFinite(n) && n !== 0) {
      return strErr(o.cestatus || o.cEst || o.mensaje || o.msg) || `Fastrax estatus ${n} (ope=3)`;
    }
  } catch {
    return null;
  }
  return "Respuesta ope3 no es imagen";
}

function fastraxPostBinaryHttps(baseUrl, postBody, timeoutMs, tls) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(baseUrl);
    } catch {
      resolve({ ok: false, status: 0, message: "URL Fastrax inválida" });
      return;
    }
    const options = {
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method: "POST",
      headers: {
        ...FORM_HEADERS,
        Accept: "image/*,application/octet-stream,*/*",
        "Content-Length": Buffer.byteLength(postBody, "utf8"),
      },
      rejectUnauthorized: tls.rejectUnauthorized,
    };
    const req = https.request(options, (r) => {
      const chunks = [];
      r.on("data", (c) => chunks.push(c));
      r.on("end", () => {
        const body = Buffer.concat(chunks);
        const status = r.statusCode || 0;
        const contentType = (r.headers["content-type"] && String(r.headers["content-type"]).split(";")[0].trim()) || "";
        if (status < 200 || status >= 300) {
          const errMsg = tryFastraxImageErrorMessage(body, contentType) || `HTTP ${status}`;
          resolve({ ok: false, status, message: errMsg, body, contentType });
        } else {
          resolve({ ok: true, status, body, contentType });
        }
      });
    });
    const timer = setTimeout(() => {
      req.destroy();
      resolve({ ok: false, status: 0, message: "Fastrax request timeout" });
    }, timeoutMs);
    req.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, status: 0, message: e instanceof Error ? e.message : String(e) });
    });
    req.write(postBody, "utf8");
    req.end();
    req.on("close", () => clearTimeout(timer));
  });
}

/**
 * ope=3: imagen del producto (`sku`, `img` índice 1..n).
 * Devuelve Buffer + contentType. Si Fastrax responde JSON/error, lo señaliza
 * con ok=false y `message`.
 */
export async function getFastraxImageOpe3(sku, img) {
  if (!fastraxConfigured()) {
    return { ok: false, status: 0, message: "Fastrax no configurado (FASTRAX_* en .env.local)" };
  }
  const { url: baseUrl } = getFastraxCreds();
  if (!baseUrl) return { ok: false, status: 0, message: "FASTRAX_API_URL vacía" };
  const sSku = String(sku ?? "").trim();
  if (!sSku) return { ok: false, status: 0, message: "Fastrax ope=3: sku requerido" };
  const nImg = Math.max(1, Math.floor(Number(img) || 1));
  const postBody = buildFormParams(3, { sku: sSku, img: String(nImg) }).toString();
  const timeoutMs = fastraxTimeoutMs();
  logFastraxOpe(3);

  if (sslInsecure()) {
    const r0 = await fastraxPostBinaryHttps(baseUrl, postBody, timeoutMs, { rejectUnauthorized: false });
    if (!r0 || !r0.ok) {
      return {
        ok: false,
        status: r0 && r0.status != null ? Number(r0.status) : 0,
        message: (r0 && r0.message) || "ope3",
      };
    }
    const buf = r0.body;
    if (!buf || buf.length === 0) return { ok: false, status: r0.status, message: "Cuerpo ope3 vacío" };
    const jsonErr = tryFastraxImageErrorMessage(buf, r0.contentType || "");
    if (jsonErr) return { ok: false, status: r0.status, message: jsonErr };
    if (buf[0] === 0x7b || buf[0] === 0x5b) {
      return { ok: false, status: r0.status, message: "Respuesta ope3: cuerpo JSON, no imagen" };
    }
    return { ok: true, body: buf, contentType: sniffOrPickImageContentType(buf, r0.contentType), status: r0.status || 200 };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(baseUrl, {
      method: "POST",
      headers: { ...FORM_HEADERS, Accept: "image/*,application/octet-stream,*/*" },
      body: postBody,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, message: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const resCt = String(res.headers.get("content-type") || "").split(";")[0].trim();
  if (!res.ok) {
    const m = tryFastraxImageErrorMessage(buf, resCt) || `HTTP ${res.status}`;
    return { ok: false, status: res.status, message: m, body: buf, contentType: resCt || undefined };
  }
  const jsonErr = tryFastraxImageErrorMessage(buf, resCt);
  if (jsonErr) return { ok: false, status: res.status, message: jsonErr, body: buf };
  if (buf.length > 0 && (buf[0] === 0x7b || buf[0] === 0x5b)) {
    return { ok: false, status: res.status, message: "Respuesta ope3: cuerpo JSON, no imagen", body: buf };
  }
  return { ok: true, body: buf, contentType: sniffOrPickImageContentType(buf, resCt), status: res.status };
}

// ============================================================================
// ope=2 en lote (concurrencia + auto-split en error).
// ============================================================================
/**
 * @param {(string|number)[]} skus
 * @param {{ batchSize?: number, concurrency?: number }} [opts]
 * Devuelve `{ ok, bySku: Map<string, raw>, missing[], failed[], stats }`.
 */
export async function getProductDetailsBatch(skus, opts = {}) {
  const t0 = Date.now();
  const list = Array.isArray(skus) ? skus.map((s) => String(s ?? "").trim()).filter(Boolean) : [];
  const uniq = [...new Set(list)];
  const stats = { skus: uniq.length, batches: 0, batches_split: 0, ok_rows: 0, missing: 0, failed: 0, duration_ms: 0 };
  const bySku = new Map();
  if (uniq.length === 0) return { ok: true, bySku, missing: [], failed: [], stats };

  const batchSize = Math.max(
    1,
    Math.min(FASTRAX_DETAIL_BATCH_MAX, Math.floor(Number(opts.batchSize) || fastraxDetailBatchSize())),
  );
  const concurrency = Math.max(
    1,
    Math.min(FASTRAX_DETAIL_CONCURRENCY_MAX, Math.floor(Number(opts.concurrency) || fastraxDetailConcurrency())),
  );

  const batches = [];
  for (let i = 0; i < uniq.length; i += batchSize) batches.push(uniq.slice(i, i + batchSize));

  const missing = new Set();
  const failed = new Set();

  const processBatch = async (batch) => {
    stats.batches += 1;
    const r = await getProductDetails(batch);
    if (!r || r.ok === false) {
      if (batch.length > 1) {
        stats.batches_split += 1;
        const mid = Math.floor(batch.length / 2);
        await processBatch(batch.slice(0, mid));
        await processBatch(batch.slice(mid));
        return;
      }
      failed.add(batch[0]);
      return;
    }
    const rows = extractProductRows(r.parsed);
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const sku = pickSkuFromRow(raw);
      if (!sku) continue;
      const found = batch.find((s) => s === sku || s.toLowerCase() === sku.toLowerCase());
      const key = found || sku;
      if (!bySku.has(key)) {
        bySku.set(key, raw);
        stats.ok_rows += 1;
      }
    }
    for (const s of batch) if (!bySku.has(s)) missing.add(s);
  };

  let cursor = 0;
  const workers = new Array(Math.min(concurrency, batches.length)).fill(0).map(async () => {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= batches.length) return;
      await processBatch(batches[idx]);
    }
  });
  await Promise.all(workers);

  stats.missing = missing.size;
  stats.failed = failed.size;
  stats.duration_ms = Date.now() - t0;
  console.info("[fastrax/batch] ope=2", stats);
  return { ok: true, bySku, missing: [...missing], failed: [...failed], stats };
}
