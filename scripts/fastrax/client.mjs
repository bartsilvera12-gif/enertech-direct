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

loadFastraxEnv();

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
