/**
 * Handlers HTTP de pedidos Fastrax (ope=12/13/15) para el mini-backend.
 * Caller ya validó JWT admin + Fastrax configurado.
 */
import { withDb } from "../../scripts/fastrax/db.mjs";
import { orderCanFulfillFastrax } from "../../scripts/fastrax/orderFastraxGates.mjs";
import {
  createFastraxOrderForInternalOrder,
  runFastraxInvoiceForMap,
} from "../../scripts/fastrax/createOrderForInternal.mjs";
import { syncFastraxOrderStatusForOrderId } from "../../scripts/fastrax/syncOrderStatus.mjs";
import { sitToLabel } from "../../scripts/fastrax/mapper.mjs";
import { readBody, json } from "../index-helpers.mjs";

export const mountedOrderPaths = [
  "/api/admin/orders/:orderId/fastrax/can-fulfill",
  "/api/admin/orders/:orderId/fastrax/status",
  "/api/admin/orders/:orderId/fastrax/sync-status",
  "/api/admin/orders/:orderId/fastrax/create",
  "/api/admin/orders/:orderId/fastrax/invoice",
  "/api/admin/orders/fastrax/status-bulk",
];

function parseOrderId(pathname) {
  const m = /^\/api\/admin\/orders\/([^/]+)\/fastrax\/(can-fulfill|status|sync-status|create|invoice)$/.exec(pathname);
  if (!m) return null;
  return { orderId: m[1], action: m[2] };
}

function fstr(x) {
  if (x == null) return "";
  return String(x);
}

function buildTrackingFromMap(map) {
  if (!map || typeof map !== "object") {
    return { fastrax_ped: null, fastrax_pdc: null, status_code: null, status_label: "", last_sync_at: null, error: null };
  }
  const pdcRaw = fstr(map.fastrax_pdc).trim() || fstr(map.fastrax_order_id).trim() || null;
  const ped = fstr(map.fastrax_ped).trim() || null;
  let codeNum = null;
  if (map.fastrax_status_code != null && !Number.isNaN(Number(map.fastrax_status_code))) {
    codeNum = Math.floor(Number(map.fastrax_status_code));
  } else if (map.fastrax_sit != null) {
    const s = fstr(map.fastrax_sit).replace(/^0+/, "") || fstr(map.fastrax_sit);
    if (s && !Number.isNaN(Number(s))) codeNum = Math.floor(Number(s));
  }
  const labelFrom = fstr(map.fastrax_status_label).trim();
  const label = labelFrom || (codeNum != null ? sitToLabel(codeNum, "Desconocido") : "");
  return {
    fastrax_ped: ped,
    fastrax_pdc: pdcRaw,
    status_code: codeNum,
    status_label: label,
    last_sync_at: map.last_sync_at || null,
    error: fstr(map.last_error).trim() || null,
  };
}

async function loadMap(client, orderId) {
  const r = await client.query("SELECT * FROM fastrax_order_map WHERE order_id = $1 LIMIT 1", [orderId]);
  return r.rows[0] || null;
}

export async function handleFastraxOrders(req, res, pathname) {
  // Status-bulk: lista de mapas para varios orderIds
  if (pathname === "/api/admin/orders/fastrax/status-bulk" && req.method === "GET") {
    return json(res, 400, { ok: false, message: "Use POST con { orderIds: [...] }" });
  }
  if (pathname === "/api/admin/orders/fastrax/status-bulk" && req.method === "POST") {
    const body = await readBody(req);
    const ids = Array.isArray(body?.orderIds) ? body.orderIds.map(fstr).filter(Boolean) : [];
    if (ids.length === 0) return json(res, 200, { ok: true, items: [] });
    const out = await withDb(async (client) => {
      const r = await client.query("SELECT * FROM fastrax_order_map WHERE order_id = ANY($1::uuid[])", [ids]);
      return r.rows.map((m) => ({ order_id: m.order_id, tracking: buildTrackingFromMap(m), map: m }));
    });
    return json(res, 200, { ok: true, items: out });
  }

  const m = parseOrderId(pathname);
  if (!m) return json(res, 404, { ok: false, message: "No encontrado." });
  const { orderId, action } = m;

  if (action === "can-fulfill" && req.method === "GET") {
    const r = await withDb((client) => orderCanFulfillFastrax(client, orderId));
    return json(res, 200, r);
  }

  if (action === "status" && req.method === "GET") {
    const r = await withDb(async (client) => {
      const map = await loadMap(client, orderId);
      return { ok: true, order_id: orderId, has_map: Boolean(map), map, tracking: buildTrackingFromMap(map) };
    });
    return json(res, 200, r);
  }

  if (action === "sync-status" && req.method === "POST") {
    const r = await withDb(async (client) => {
      const s = await syncFastraxOrderStatusForOrderId(client, orderId);
      const map = await loadMap(client, orderId);
      return { ...s, order_id: orderId, has_map: Boolean(map), map, tracking: buildTrackingFromMap(map) };
    });
    const status = r.ok ? 200 : r.reason === "no_map" ? 404 : r.reason === "not_configured" ? 503 : 502;
    return json(res, status, r);
  }

  if (action === "create" && req.method === "POST") {
    const body = await readBody(req);
    // Doble cerrojo: ENV `FASTRAX_CREATE_REMOTE_ORDERS=1` + body.confirm===true
    const envOk = String(process.env.FASTRAX_CREATE_REMOTE_ORDERS || "0").trim() === "1";
    if (!envOk) {
      return json(res, 403, {
        ok: false,
        reason: "remote_orders_disabled",
        message: "FASTRAX_CREATE_REMOTE_ORDERS=0; setealo a 1 server-side para enviar pedidos reales.",
      });
    }
    if (body?.confirm !== true && body?.force !== true) {
      return json(res, 400, {
        ok: false,
        reason: "confirm_required",
        message: "Falta confirm:true en el body para enviar el pedido a Fastrax.",
      });
    }
    const r = await withDb((client) =>
      createFastraxOrderForInternalOrder(client, orderId, { context: "admin", force: body?.force === true }),
    );
    // Un rechazo de Fastrax (estatus/cestatus) es un error de negocio, NO una caída
    // de gateway: exponer el motivo real y usar 422 (no 502, que confunde con nginx).
    if (!r.ok && !r.message) {
      r.message = r.cestatus || r.error || "Fastrax no aceptó el pedido.";
    }
    return json(res, r.ok ? 200 : 422, r);
  }

  if (action === "invoice" && req.method === "POST") {
    const body = await readBody(req);
    if (body?.confirm !== true) {
      return json(res, 400, { ok: false, reason: "confirm_required", message: "Falta confirm:true en el body." });
    }
    const r = await withDb((client) => runFastraxInvoiceForMap(client, orderId));
    return json(res, r.ok ? 200 : 502, r);
  }

  return json(res, 405, { ok: false, message: "Método no permitido." });
}
