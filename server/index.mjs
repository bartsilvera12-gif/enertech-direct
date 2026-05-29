#!/usr/bin/env node
/**
 * Mini-backend Fastrax (Node puro, sin dependencias).
 * Guarda las credenciales Fastrax server-side y expone endpoints para que el admin
 * dispare el sync desde el catálogo. El navegador nunca ve cod/pas.
 *
 * Correr:  npm run server         (lee .env.local)
 *
 * Endpoints:
 *   GET  /api/health              → liveness (público).
 *   GET  /api/fastrax/health      → ope=10 versión Fastrax (requiere admin).
 *   POST /api/fastrax/sync        → sync catálogo. body: { apply?, all?, page?, size?, maxPages?, detailBatch? } (requiere admin).
 *   POST /api/fastrax/stock       → sync saldo/precio. body: { apply?, batch?, skus? } (requiere admin).
 *
 * Seguridad: todo lo que toca Fastrax/DB exige JWT de admin (ver fastrax-auth.mjs). dryRun por defecto.
 */
import http from "node:http";
import { loadFastraxEnv } from "../scripts/fastrax/env.mjs";
import { fastraxConfigured, getVersion } from "../scripts/fastrax/client.mjs";
import { runProductSync, runStockSync } from "../scripts/fastrax/sync-core.mjs";
import { verifyAdmin } from "./fastrax-auth.mjs";

loadFastraxEnv();

const PORT = Number(process.env.FASTRAX_BACKEND_PORT || 8787);
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

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) req.destroy(); // límite defensivo 1MB
      else chunks.push(c);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function bearer(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : "";
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  try {
    // Liveness público (no toca Fastrax ni datos).
    if (req.method === "GET" && path === "/api/health") {
      return json(res, 200, { ok: true, service: "fastrax-backend", fastraxConfigured: fastraxConfigured() });
    }

    // Todo lo demás (Fastrax/DB) requiere admin.
    if (path === "/api/fastrax/health" || path === "/api/fastrax/sync" || path === "/api/fastrax/stock") {
      const auth = await verifyAdmin(bearer(req));
      if (!auth.ok) return json(res, auth.status, { ok: false, message: auth.message });
      if (!fastraxConfigured()) return json(res, 503, { ok: false, message: "Fastrax no configurado (FASTRAX_* en .env.local)." });

      if (req.method === "GET" && path === "/api/fastrax/health") {
        const r = await getVersion();
        const version = r.ok ? (Array.isArray(r._fastrax_data) ? r._fastrax_data[0] : r.parsed) : null;
        return json(res, r.ok ? 200 : 502, { ok: r.ok, version, message: r.message });
      }

      if (req.method === "POST" && path === "/api/fastrax/sync") {
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

      if (req.method === "POST" && path === "/api/fastrax/stock") {
        const body = await readBody(req);
        const result = await runStockSync({
          apply: body.apply === true,
          batch: body.batch,
          skus: body.skus,
        });
        return json(res, 200, { ok: true, ...result });
      }

      return json(res, 405, { ok: false, message: "Método no permitido." });
    }

    return json(res, 404, { ok: false, message: "No encontrado." });
  } catch (e) {
    return json(res, 500, { ok: false, message: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`[fastrax-backend] http://localhost:${PORT}`);
  console.log(`[fastrax-backend] CORS: ${ALLOWED_ORIGINS.join(", ")}`);
  console.log(`[fastrax-backend] Fastrax configurado: ${fastraxConfigured()}`);
});
