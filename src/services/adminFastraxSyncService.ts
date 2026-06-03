import { supabase } from "@/lib/supabase";

/**
 * Cliente del mini-backend Fastrax (server/index.mjs).
 * El navegador NUNCA ve cod/pas: solo manda su JWT de Supabase y el backend
 * valida admin + dispara el sync server-side. dryRun por defecto.
 */
const BACKEND_URL = (import.meta.env.VITE_FASTRAX_BACKEND_URL?.trim() || "http://localhost:8787").replace(/\/+$/, "");

export type FastraxSyncStats = {
  insert: number;
  link: number;
  update: number;
  skip: number;
  fail: number;
};

export type FastraxSyncPreviewRow = {
  sku: string;
  name: string;
  price: number | null;
  stock: number | null;
};

export type FastraxSyncResult = {
  ok: boolean;
  stats: FastraxSyncStats;
  preview: FastraxSyncPreviewRow[];
  indexCount: number;
  applied: boolean;
  logs: string[];
};

export type FastraxStockStats = {
  found: number;
  updated: number;
  missing: number;
  fail: number;
};

export type FastraxStockResult = {
  ok: boolean;
  stats: FastraxStockStats;
  applied: boolean;
  logs: string[];
};

export type FastraxHealth = {
  ok: boolean;
  version: unknown;
  message?: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Volvé a iniciar sesión como administrador.");
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...headers, ...(init.headers ?? {}) },
    });
  } catch {
    throw new Error(
      `No se pudo contactar el backend Fastrax en ${BACKEND_URL}. ` +
        "¿Está corriendo `npm run server`?",
    );
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok || (body && typeof body === "object" && "ok" in body && (body as { ok: boolean }).ok === false)) {
    const msg = (body as { message?: string } | null)?.message || `Error ${res.status} del backend Fastrax.`;
    throw new Error(msg);
  }
  return body as T;
}

/** ope=10: liveness + versión Fastrax (requiere admin). */
export function fetchFastraxHealth(): Promise<FastraxHealth> {
  return request<FastraxHealth>("/api/fastrax/health", { method: "GET" });
}

/**
 * Sincroniza catálogo (ope=4 + ope=2). dryRun por defecto.
 * @param opts apply (escribe), all (todas las páginas), page, size, maxPages, detailBatch
 */
export function runFastraxProductSync(opts: {
  apply?: boolean;
  all?: boolean;
  page?: number;
  size?: number;
  maxPages?: number;
  detailBatch?: number;
} = {}): Promise<FastraxSyncResult> {
  return request<FastraxSyncResult>("/api/fastrax/sync", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

/**
 * Sincroniza saldo/precio (ope=11) al snapshot fastrax_stock/fastrax_price. dryRun por defecto.
 * @param opts apply (escribe), batch, skus[]
 */
export function runFastraxStockSync(opts: {
  apply?: boolean;
  batch?: number;
  skus?: string[];
} = {}): Promise<FastraxStockResult> {
  return request<FastraxStockResult>("/api/fastrax/stock", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

// ============================================================================
// FASE 2/4 — catálogo controlado: búsqueda e importación quirúrgica.
// ============================================================================

export type FastraxSearchItem = {
  fastrax_sku: string;
  name: string;
  price: number | null;
  stock: number | null;
  brand: string | null;
  category: string | null;
  description: string | null;
  image: string | null;
  image_count?: number;
  active_remote?: string | null;
  raw?: Record<string, unknown>;
};

export type FastraxSearchResult = {
  ok: boolean;
  ope?: string | number;
  page?: number;
  size?: number;
  total: number;
  /** SKUs crudos devueltos por ope=4 antes de filtros — para decidir paginación. */
  index_count?: number;
  /** Backend marca true si la página cruda de Fastrax estaba llena (puede haber más). */
  has_more?: boolean;
  items: FastraxSearchItem[];
  stats?: { skus: number; batches: number; ok_rows: number; missing: number; failed: number; duration_ms: number } | null;
  message?: string;
};

export type FastraxImportStats = {
  inserted: number;
  updated: number;
  linked: number;
  skipped: number;
  failed: number;
};

export type FastraxImportResultRow = {
  sku: string;
  ok: boolean;
  action?: "inserted" | "updated" | "linked";
  id?: string;
  skipped?: string;
  error?: string;
};

export type FastraxImportResult = {
  ok: boolean;
  results: FastraxImportResultRow[];
  stats: FastraxImportStats;
  total?: number;
  page?: number;
  size?: number;
  pages_scanned?: number[];
  message?: string;
};

export type FastraxDetailsBatchItem = FastraxSearchItem & {
  raw_detail?: Record<string, unknown>;
  images_count?: number;
};

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** ope=4 + ope=2 (lectura): hasta 20 items por página. */
export function searchFastraxProducts(opts: {
  q?: string;
  page?: number;
  size?: number;
  only_stock?: boolean;
  sku?: string;
}): Promise<FastraxSearchResult> {
  return request<FastraxSearchResult>(`/api/admin/fastrax/products/search${qs(opts as Record<string, string | number | boolean | undefined | null>)}`, { method: "GET" });
}

/** Solo ope=4 (lista rápida, sin detalles). */
export function listFastraxFast(opts: {
  page?: number;
  size?: number;
  q?: string;
  only_stock?: boolean;
}): Promise<FastraxSearchResult> {
  return request<FastraxSearchResult>(`/api/admin/fastrax/products/list-fast${qs(opts as Record<string, string | number | boolean | undefined | null>)}`, { method: "GET" });
}

/** Búsqueda multi-página (hasta 200 resultados). */
export function searchFastraxGlobal(opts: {
  q?: string;
  maxPages?: number;
  maxResults?: number;
  only_stock?: boolean;
}): Promise<FastraxSearchResult & { pages_scanned?: number }> {
  return request(`/api/admin/fastrax/products/search-global${qs(opts as Record<string, string | number | boolean | undefined | null>)}`, { method: "GET" });
}

/** Detalles ope=2 en lote para una lista de SKUs. */
export function loadFastraxDetailsBatch(skus: string[]): Promise<{
  ok: boolean;
  items: FastraxDetailsBatchItem[];
  stats: { skus: number; batches: number; ok_rows: number; missing: number; failed: number; duration_ms: number } | null;
  missing?: string[];
  failed?: string[];
}> {
  return request("/api/admin/fastrax/products/details-batch", {
    method: "POST",
    body: JSON.stringify({ skus }),
  });
}

/** Importa SKUs específicos (o items ya resueltos con raw_detail). */
export function importFastraxSkus(payload:
  | { skus: string[] }
  | { items: FastraxDetailsBatchItem[] }
): Promise<FastraxImportResult> {
  return request("/api/admin/fastrax/products/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Importa todos los SKUs de UNA página ope=4. */
export function importFastraxPage(opts: { page: number; size?: number }): Promise<FastraxImportResult> {
  return request("/api/admin/fastrax/products/import-page", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

/** Importa un rango de páginas ope=4 (cuidado con el volumen). */
export function importFastraxRange(opts: { pageFrom: number; pageTo: number; size?: number }): Promise<FastraxImportResult> {
  return request("/api/admin/fastrax/products/import-range", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

/** URL absoluta para mostrar una imagen Fastrax bajada (vía proxy ope=3). */
export function fastraxProductImageUrl(sku: string, img = 1): string {
  return `${BACKEND_URL}/api/admin/fastrax/products/${encodeURIComponent(sku)}/image/${img}`;
}

// ============================================================================
// FASE 5 — pedidos Fastrax.
// ============================================================================

export type FastraxOrderTracking = {
  fastrax_ped: string | null;
  fastrax_pdc: string | null;
  status_code: number | null;
  status_label: string;
  last_sync_at: string | null;
  error: string | null;
};

export type FastraxOrderStatus = {
  ok: boolean;
  order_id: string;
  has_map: boolean;
  map: Record<string, unknown> | null;
  tracking: FastraxOrderTracking;
  reason?: string;
};

export function fetchOrderCanFulfillFastrax(orderId: string): Promise<{ ok: boolean; reason?: string; fastraxItemCount?: number }> {
  return request(`/api/admin/orders/${encodeURIComponent(orderId)}/fastrax/can-fulfill`, { method: "GET" });
}

export function fetchOrderFastraxStatus(orderId: string): Promise<FastraxOrderStatus> {
  return request(`/api/admin/orders/${encodeURIComponent(orderId)}/fastrax/status`, { method: "GET" });
}

export function syncOrderFastraxStatus(orderId: string): Promise<FastraxOrderStatus> {
  return request(`/api/admin/orders/${encodeURIComponent(orderId)}/fastrax/sync-status`, { method: "POST", body: "{}" });
}

export function createOrderInFastrax(orderId: string, opts: { confirm: true; force?: boolean }): Promise<{
  ok: boolean;
  order_id: string;
  fastrax_pdc?: string;
  fastrax_ped?: string;
  invoice_ok?: boolean;
  invoice_error?: string | null;
  reason?: string;
  error?: string;
}> {
  return request(`/api/admin/orders/${encodeURIComponent(orderId)}/fastrax/create`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export function invoiceOrderInFastrax(orderId: string): Promise<{ ok: boolean; message: string; parsed: unknown }> {
  return request(`/api/admin/orders/${encodeURIComponent(orderId)}/fastrax/invoice`, {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}

export function fetchOrderFastraxStatusBulk(orderIds: string[]): Promise<{
  ok: boolean;
  items: Array<{ order_id: string; tracking: FastraxOrderTracking; map: Record<string, unknown> }>;
}> {
  return request("/api/admin/orders/fastrax/status-bulk", {
    method: "POST",
    body: JSON.stringify({ orderIds }),
  });
}
