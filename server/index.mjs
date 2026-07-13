#!/usr/bin/env node
/**
 * Mini-backend Fastrax (Node puro, sin Express). Mantiene server-side las
 * credenciales Fastrax y expone endpoints autenticados con JWT admin Supabase.
 *
 * Correr:  npm run server         (lee .env.local)
 *
 * Endpoints públicos:
 *   GET  /api/health                          → liveness
 *   GET  /fastrax-products/*                  → estático: imágenes Fastrax bajadas (ope=3)
 *
 * Endpoints autenticados (JWT admin Supabase):
 *   GET  /api/fastrax/health                  → ope=10 versión
 *   GET  /api/fastrax/version                 → alias
 *   POST /api/fastrax/sync                    → sync masivo ope=4+ope=2
 *   POST /api/fastrax/stock                   → sync ope=11 saldo/precio
 *   GET  /api/admin/fastrax/products/search           → ope=4 + ope=2 (lectura)
 *   GET  /api/admin/fastrax/products/list-fast        → solo ope=4
 *   GET  /api/admin/fastrax/products/search-global    → ope=4 multi-página
 *   POST /api/admin/fastrax/products/details-batch    → ope=2 batch para SKUs
 *   GET  /api/admin/fastrax/products/:sku/image/:img  → ope=3 binario
 *   POST /api/admin/fastrax/products/import           → import por SKUs
 *   POST /api/admin/fastrax/products/import-page      → import página completa
 *   POST /api/admin/fastrax/products/import-range     → import rango páginas
 *   GET  /api/admin/orders/:orderId/fastrax/can-fulfill
 *   GET  /api/admin/orders/:orderId/fastrax/status    → mapa actual (no llama Fastrax)
 *   POST /api/admin/orders/:orderId/fastrax/sync-status → ope=13
 *   POST /api/admin/orders/:orderId/fastrax/create    → ope=12
 *   POST /api/admin/orders/:orderId/fastrax/invoice   → ope=15 (confirmación obligatoria)
 *
 * Seguridad: todo lo que toca Fastrax/DB exige JWT admin. dryRun por defecto.
 * `ope=12` real solo si `FASTRAX_CREATE_REMOTE_ORDERS=1`. `ope=15` automática
 * solo si `FASTRAX_AUTO_INVOICE=1`.
 */
import http from "node:http";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFastraxEnv } from "../scripts/fastrax/env.mjs";
import { fastraxConfigured, getVersion } from "../scripts/fastrax/client.mjs";
import { runProductSync, runStockSync } from "../scripts/fastrax/sync-core.mjs";
import { verifyAdmin } from "./fastrax-auth.mjs";
import { json, readBody } from "./index-helpers.mjs";
import { handleFastraxCatalog, mountedCatalogPaths } from "./routes/fastrax-catalog.mjs";
import { handleFastraxOrders, mountedOrderPaths } from "./routes/fastrax-orders.mjs";
import { startFastraxOrderDispatcher } from "./fastrax-order-dispatcher.mjs";

loadFastraxEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_ROOT = path.join(__dirname, "public");
/** Build de Vite. En producción Hostinger este directorio existe en el repo
 *  raíz tras `npm run build`. En dev local el front lo sirve Vite en :8080 y
 *  este servidor solo expone /api. */
const DIST_ROOT = path.join(__dirname, "..", "dist");
const HAS_DIST = fs.existsSync(DIST_ROOT) && fs.existsSync(path.join(DIST_ROOT, "index.html"));

const PORT = Number(process.env.PORT || process.env.FASTRAX_BACKEND_PORT || 8787);
const ALLOWED_ORIGINS = (process.env.FASTRAX_BACKEND_CORS_ORIGINS || "http://localhost:8080,http://127.0.0.1:8080")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
}

function bearer(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : "";
}

const CONTENT_TYPE_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

/**
 * Sirve un archivo del bundle Vite `dist/` con sandbox path + content-type.
 * Si `urlPath` no resuelve a un archivo real, hace SPA fallback a `dist/index.html`
 * (necesario para que React Router maneje /admin/*, /product/:slug, etc.).
 */
async function serveDist(req, res, urlPath) {
  const safe = urlPath.replace(/\\/g, "/").replace(/\.+\//g, "");
  const rel = safe.replace(/^\/+/, "") || "index.html";
  const abs = path.resolve(DIST_ROOT, rel);
  if (!abs.startsWith(DIST_ROOT)) return json(res, 403, { ok: false, message: "Forbidden" });

  let stat;
  try {
    stat = await fsPromises.stat(abs);
  } catch {
    // SPA fallback: ruta inexistente → entregar index.html para que React Router resuelva.
    return serveDistFile(req, res, path.join(DIST_ROOT, "index.html"));
  }
  if (stat.isDirectory()) {
    return serveDistFile(req, res, path.join(abs, "index.html"));
  }
  return serveDistFile(req, res, abs);
}

function serveDistFile(req, res, abs) {
  const ext = path.extname(abs).toLowerCase();
  const ct = CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream";
  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    return json(res, 404, { ok: false, message: "Not found" });
  }
  // index.html sin cache (SPA con hash en assets, pero el HTML debe ser fresco).
  const cacheControl = ext === ".html"
    ? "no-cache, no-store, must-revalidate"
    : ext === ".js" || ext === ".css" || ext === ".woff" || ext === ".woff2"
      ? "public, max-age=31536000, immutable" // assets con hash → cache largo
      : "public, max-age=86400";
  res.writeHead(200, {
    "Content-Type": ct,
    "Content-Length": String(stat.size),
    "Cache-Control": cacheControl,
  });
  fs.createReadStream(abs).pipe(res);
}

async function serveStatic(req, res, urlPath) {
  // urlPath empieza con "/fastrax-products/..."
  const safe = urlPath.replace(/\\/g, "/").replace(/\.+\//g, "");
  const rel = safe.replace(/^\/+/, "");
  const abs = path.resolve(STATIC_ROOT, rel);
  // sandbox: no salir de STATIC_ROOT
  if (!abs.startsWith(STATIC_ROOT)) return json(res, 403, { ok: false, message: "Forbidden" });
  let stat;
  try {
    stat = await fsPromises.stat(abs);
  } catch {
    return json(res, 404, { ok: false, message: "Not found" });
  }
  if (!stat.isFile()) return json(res, 404, { ok: false, message: "Not a file" });
  const ext = path.extname(abs).toLowerCase();
  const ct = CONTENT_TYPE_BY_EXT[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": ct,
    "Content-Length": String(stat.size),
    "Cache-Control": "public, max-age=86400",
  });
  fs.createReadStream(abs).pipe(res);
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  try {
    // ---- estáticos públicos
    if (req.method === "GET" && pathname.startsWith("/fastrax-products/")) {
      return serveStatic(req, res, pathname);
    }

    // ---- liveness público
    if (req.method === "GET" && pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "fastrax-backend", fastraxConfigured: fastraxConfigured() });
    }

    const matchesPattern = (p) => {
      if (!p.includes(":")) return pathname === p;
      const re = new RegExp(`^${p.replace(/:[^/]+/g, "[^/]+")}$`);
      return re.test(pathname);
    };
    const isFastraxLegacy = pathname === "/api/fastrax/health" || pathname === "/api/fastrax/sync" || pathname === "/api/fastrax/stock" || pathname === "/api/fastrax/version";
    const isFastraxCatalog = mountedCatalogPaths.some(matchesPattern);
    const isFastraxOrders = mountedOrderPaths.some(matchesPattern);

    if (!isFastraxLegacy && !isFastraxCatalog && !isFastraxOrders) {
      // No es API ni estático /fastrax-products. En producción, servimos el
      // bundle Vite (`dist/`). En dev local sin dist, devolvemos 404 con hint.
      if (HAS_DIST && req.method === "GET") {
        return serveDist(req, res, pathname);
      }
      return json(res, 404, {
        ok: false,
        message: HAS_DIST ? "No encontrado." : "No encontrado (dist/ ausente — corré `npm run build` para servir el frontend desde este server).",
      });
    }

    // ---- auth admin
    const auth = await verifyAdmin(bearer(req));
    if (!auth.ok) return json(res, auth.status, { ok: false, message: auth.message });
    if (!fastraxConfigured()) {
      return json(res, 503, { ok: false, message: "Fastrax no configurado (FASTRAX_* en .env.local)." });
    }

    // ---- endpoints legacy (compat)
    if (req.method === "GET" && (pathname === "/api/fastrax/health" || pathname === "/api/fastrax/version")) {
      const r = await getVersion();
      const version = r.ok ? (Array.isArray(r._fastrax_data) ? r._fastrax_data[0] : r.parsed) : null;
      return json(res, r.ok ? 200 : 502, { ok: r.ok, version, message: r.message });
    }
    if (req.method === "POST" && pathname === "/api/fastrax/sync") {
      const body = await readBody(req);
      const result = await runProductSync({
        page: body.page,
        size: body.size,
        all: body.all === true,
        maxPages: body.maxPages,
        detailBatch: body.detailBatch,
        apply: body.apply === true,
      });
      return json(res, 200, { ok: true, ...result });
    }
    if (req.method === "POST" && pathname === "/api/fastrax/stock") {
      const body = await readBody(req);
      const result = await runStockSync({ apply: body.apply === true, batch: body.batch, skus: body.skus });
      return json(res, 200, { ok: true, ...result });
    }

    // ---- catálogo (FASE 2)
    if (isFastraxCatalog) {
      return handleFastraxCatalog(req, res, pathname, url);
    }

    // ---- pedidos (FASE 5)
    if (isFastraxOrders) {
      return handleFastraxOrders(req, res, pathname);
    }

    return json(res, 405, { ok: false, message: "Método no permitido." });
  } catch (e) {
    console.error("[fastrax-backend] error:", e);
    return json(res, 500, { ok: false, message: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`[enertech-server] http://localhost:${PORT}`);
  console.log(`[enertech-server] CORS: ${ALLOWED_ORIGINS.join(", ")}`);
  console.log(`[enertech-server] Fastrax configurado: ${fastraxConfigured()}`);
  console.log(`[enertech-server] static /fastrax-products → ${STATIC_ROOT}/fastrax-products`);
  console.log(`[enertech-server] frontend dist → ${HAS_DIST ? DIST_ROOT : "(ausente, solo /api disponible)"}`);
  // Despacho automático de pedidos a Fastrax (gated por FASTRAX_AUTO_DISPATCH).
  startFastraxOrderDispatcher();
});
