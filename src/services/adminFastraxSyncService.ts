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
