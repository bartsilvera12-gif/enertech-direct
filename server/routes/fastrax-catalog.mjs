/**
 * Handlers HTTP del catálogo Fastrax para el mini-backend de Enertech.
 * Todos asumen que el caller ya validó el JWT admin y que Fastrax está
 * configurado.
 */
import { getFastraxImageOpe3 } from "../../scripts/fastrax/client.mjs";
import {
  importFastraxItemsToProducts,
  importFastraxPageRangeWithBatch,
  importFastraxPageWithBatch,
  importFastraxSkusToProducts,
  loadFastraxBatchDetailsForSkus,
  searchFastraxAllPagesOpe4Global,
  searchFastraxFastListOpe4Only,
  searchFastraxReadonlyOpe4Ope2,
} from "../../scripts/fastrax/controlledCatalog.mjs";
import { readBody, json } from "../index-helpers.mjs";

export const mountedCatalogPaths = [
  "/api/admin/fastrax/products/search",
  "/api/admin/fastrax/products/search-global",
  "/api/admin/fastrax/products/list-fast",
  "/api/admin/fastrax/products/details-batch",
  "/api/admin/fastrax/products/import",
  "/api/admin/fastrax/products/import-page",
  "/api/admin/fastrax/products/import-range",
  "/api/admin/fastrax/products/:sku/image/:img",
];

function parseImagePath(pathname) {
  const m = /^\/api\/admin\/fastrax\/products\/([^/]+)\/image\/([^/]+)$/.exec(pathname);
  if (!m) return null;
  return { sku: decodeURIComponent(m[1]), img: m[2] };
}

export async function handleFastraxCatalog(req, res, pathname, url) {
  // Imagen ope=3
  const imgM = parseImagePath(pathname);
  if (imgM && req.method === "GET") {
    const nImg = Math.max(1, Math.floor(Number(imgM.img) || 1));
    const r = await getFastraxImageOpe3(imgM.sku, nImg);
    if (!r || !r.ok) return json(res, 502, { ok: false, error: (r && r.message) || "ope3" });
    if (!r.body) return json(res, 502, { ok: false, error: "Cuerpo imagen vacío" });
    res.writeHead(200, {
      "Content-Type": r.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=300",
      "Content-Length": String(r.body.length),
    });
    return res.end(r.body);
  }

  // search (ope=4 + ope=2)
  if (pathname === "/api/admin/fastrax/products/search" && req.method === "GET") {
    const q = url.searchParams.get("q") || url.searchParams.get("search") || undefined;
    const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
    const size = Math.max(1, Math.min(20, Math.floor(Number(url.searchParams.get("size")) || 20)));
    const sku = url.searchParams.get("sku") || undefined;
    const only_stock = /^(1|true|yes|y)$/i.test(String(url.searchParams.get("only_stock") || ""));
    const r = await searchFastraxReadonlyOpe4Ope2({ q, page, size, sku, only_stock });
    return json(res, r && r.ok ? 200 : 502, r || { ok: false, error: "search_failed" });
  }

  // list-fast (solo ope=4)
  if (pathname === "/api/admin/fastrax/products/list-fast" && req.method === "GET") {
    const page = Math.max(1, Math.floor(Number(url.searchParams.get("page")) || 1));
    const size = Math.max(1, Math.min(500, Math.floor(Number(url.searchParams.get("size")) || 50)));
    const q = url.searchParams.get("q") || undefined;
    const only_stock = /^(1|true|yes|y)$/i.test(String(url.searchParams.get("only_stock") || ""));
    const r = await searchFastraxFastListOpe4Only({ page, size, q, only_stock });
    return json(res, r && r.ok ? 200 : 502, r || { ok: false, error: "list_fast_failed" });
  }

  // search-global (varias páginas hasta tope)
  if (pathname === "/api/admin/fastrax/products/search-global" && req.method === "GET") {
    const q = url.searchParams.get("q") || undefined;
    const maxPages = Math.max(1, Math.min(30, Math.floor(Number(url.searchParams.get("maxPages")) || 30)));
    const maxResults = Math.max(1, Math.min(200, Math.floor(Number(url.searchParams.get("maxResults")) || 200)));
    const only_stock = /^(1|true|yes|y)$/i.test(String(url.searchParams.get("only_stock") || ""));
    const r = await searchFastraxAllPagesOpe4Global({ q, maxPages, maxResults, only_stock });
    return json(res, r && r.ok ? 200 : 502, r || { ok: false, error: "search_global_failed" });
  }

  // details-batch (ope=2 batch para una lista de SKUs)
  if (pathname === "/api/admin/fastrax/products/details-batch" && req.method === "POST") {
    const body = await readBody(req);
    const skus = Array.isArray(body?.skus) ? body.skus : [];
    const r = await loadFastraxBatchDetailsForSkus(skus);
    return json(res, 200, r);
  }

  // import por SKUs
  if (pathname === "/api/admin/fastrax/products/import" && req.method === "POST") {
    const body = await readBody(req);
    if (Array.isArray(body?.items) && body.items.length > 0) {
      const r = await importFastraxItemsToProducts(body.items);
      return json(res, 200, r);
    }
    const skus = Array.isArray(body?.skus) ? body.skus : [];
    const r = await importFastraxSkusToProducts(skus);
    return json(res, 200, r);
  }

  // import-page
  if (pathname === "/api/admin/fastrax/products/import-page" && req.method === "POST") {
    const body = await readBody(req);
    const r = await importFastraxPageWithBatch({ page: body?.page, size: body?.size });
    return json(res, 200, r);
  }

  // import-range
  if (pathname === "/api/admin/fastrax/products/import-range" && req.method === "POST") {
    const body = await readBody(req);
    const r = await importFastraxPageRangeWithBatch({
      pageFrom: body?.pageFrom,
      pageTo: body?.pageTo,
      size: body?.size,
    });
    return json(res, 200, r);
  }

  return json(res, 405, { ok: false, message: "Método no permitido." });
}
