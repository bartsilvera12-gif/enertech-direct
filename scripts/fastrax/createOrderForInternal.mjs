/**
 * ope=12 (crear pedido en Fastrax) + idempotencia + auto-invoice opcional.
 *
 * Diseño:
 *  - Lee items y resuelve qué líneas son Fastrax (product_source_type='fastrax'
 *    o external_provider='fastrax' o fastrax_enabled=true).
 *  - Arma payload { ped, sku, qtd, gra, pgt }.
 *  - `ped` ≤ 20 chars: prioriza `orders.order_number` si está; si no, genera
 *    `FX-<16 hex MAYÚSCULAS>` derivado del uuid del pedido (estable).
 *  - Persiste en `enertech.fastrax_order_map` (UNIQUE en order_id).
 *  - Idempotencia: si ya hay un map en status='succeeded', no reenvía (a menos
 *    que se pase `force:true`).
 *  - Si FASTRAX_AUTO_INVOICE=1, dispara ope=15 tras un ope=12 exitoso.
 *
 * Requiere `supabase/sql/17_fastrax_external_phase2.sql` aplicado.
 */
import {
  createFastraxRemoteOrder12,
  fastraxConfigured,
  fastraxEnabled,
  fastraxInvoiceOrder15,
  fastraxPgt,
} from "./client.mjs";
import { extractFastraxPedPdc } from "./fastraxResponse.mjs";
import { FASTRAX_SOURCE } from "./mapper.mjs";

const FASTRAX_PED_MAX_LEN = 20;

function str(x) {
  if (x == null) return "";
  return String(x);
}

function buildGra(skus) {
  const n = skus.length;
  if (n === 0) return "";
  if (n === 1) return str(process.env.FASTRAX_GRA_FIRST ?? "");
  return new Array(n).fill("").join(",");
}

function generateFastraxPedFromOid(oid) {
  const compact = str(oid).replace(/-/g, "").toUpperCase();
  return `FX-${compact.slice(0, 16)}`.slice(0, FASTRAX_PED_MAX_LEN);
}

async function resolveFastraxPed(client, orderId, existingPed) {
  const oid = str(orderId).trim();
  const reused = str(existingPed).trim();
  if (reused && reused.length > 0 && reused.length <= FASTRAX_PED_MAX_LEN) return reused;

  try {
    const r = await client.query("SELECT order_number FROM orders WHERE id = $1 LIMIT 1", [oid]);
    const num = str(r.rows[0]?.order_number).trim();
    if (num && num.length > 0 && num.length <= FASTRAX_PED_MAX_LEN) return num;
  } catch {
    // ignore
  }
  return generateFastraxPedFromOid(oid);
}

function pickExternalSku(prod) {
  const ext = str(prod.external_sku) || str(prod.external_product_id) || str(prod.fastrax_sku) || str(prod.sku);
  return ext;
}

async function upsertMap(client, row) {
  const oid = row.order_id;
  // INSERT … ON CONFLICT order_id DO UPDATE …  pero permitimos columnas
  // parciales en cada llamada usando coalesce-explícito.
  const cols = [
    "order_id",
    "status",
    "fastrax_status",
    "fastrax_order_id",
    "fastrax_ped",
    "fastrax_pdc",
    "fastrax_sit",
    "fastrax_status_code",
    "fastrax_status_label",
    "payload",
    "response",
    "invoice_response",
    "last_error",
    "last_sync_at",
    "updated_at",
  ];
  const values = cols.map((c) => {
    if (c === "order_id") return oid;
    if (c === "updated_at") return row.updated_at || new Date().toISOString();
    const v = row[c];
    if (v === undefined) return null;
    if (typeof v === "object" && v !== null) return JSON.stringify(v);
    return v;
  });
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(",");
  const updateSet = cols
    .filter((c) => c !== "order_id")
    .map((c) => {
      if (c === "payload" || c === "response" || c === "invoice_response") {
        return `${c} = COALESCE(EXCLUDED.${c}, fastrax_order_map.${c})`;
      }
      return `${c} = COALESCE(EXCLUDED.${c}, fastrax_order_map.${c})`;
    })
    .join(",\n          ");

  const sql = `INSERT INTO fastrax_order_map (${cols.join(",")})
       VALUES (${placeholders})
       ON CONFLICT (order_id) DO UPDATE SET
          ${updateSet}`;
  try {
    await client.query(sql, values);
  } catch (e) {
    console.warn(`[fastrax/order] upsert map fail: ${e instanceof Error ? e.message : e}`);
  }
}

async function recordFailure(client, orderId, message, fullResponse, payload) {
  await upsertMap(client, {
    order_id: orderId,
    status: "failed",
    fastrax_status: "failed",
    last_error: String(message).slice(0, 2_000),
    response: fullResponse && typeof fullResponse === "object" ? fullResponse : { raw: fullResponse },
    payload: payload || null,
    updated_at: new Date().toISOString(),
  });
}

async function runFastraxAutoInvoiceOpe15(pdc, ped) {
  if (str(process.env.FASTRAX_AUTO_INVOICE).trim() !== "1") {
    return { ok: true, skipped: true, message: null, parsed: null };
  }
  const body = pdc ? { pdc: str(pdc) } : { ped: str(ped) };
  const r = await fastraxInvoiceOrder15(body);
  if (!r || r.ok === false) {
    return { ok: false, skipped: false, message: (r && (r.message || r.cestatus)) || "ope15", parsed: r?.parsed };
  }
  return { ok: true, skipped: false, message: null, parsed: r.parsed };
}

/**
 * Crea (o re-envía) el pedido en Fastrax para `orderId`.
 * @param {import('pg').Client} client — pg client con search_path enertech
 * @param {string} orderId
 * @param {{ context?: string, force?: boolean }} [options]
 */
export async function createFastraxOrderForInternalOrder(client, orderId, options = {}) {
  if (!fastraxEnabled()) return { ok: true, skipped: true, reason: "fastrax_disabled" };
  if (!fastraxConfigured()) return { ok: true, skipped: true, reason: "fastrax_not_configured" };

  const oid = str(orderId).trim();
  if (!oid) return { ok: true, skipped: true, reason: "empty_order_id" };

  let mapEx = null;
  try {
    const r = await client.query("SELECT * FROM fastrax_order_map WHERE order_id = $1 LIMIT 1", [oid]);
    mapEx = r.rows[0] || null;
  } catch (e) {
    return { ok: false, order_id: oid, error: e instanceof Error ? e.message : String(e) };
  }
  if (mapEx && str(mapEx.fastrax_status) === "succeeded" && (mapEx.fastrax_pdc || mapEx.fastrax_order_id) && !options.force) {
    return {
      ok: true,
      skipped: true,
      reason: "already_created",
      order_id: oid,
      fastrax_pdc: str(mapEx.fastrax_pdc) || str(mapEx.fastrax_order_id),
      fastrax_ped: str(mapEx.fastrax_ped) || null,
    };
  }

  let orderRow;
  try {
    const r = await client.query("SELECT id, order_number FROM orders WHERE id = $1 LIMIT 1", [oid]);
    orderRow = r.rows[0] || null;
  } catch (e) {
    return { ok: false, order_id: oid, error: e instanceof Error ? e.message : String(e) };
  }
  if (!orderRow) return { ok: true, skipped: true, reason: "order_not_found" };

  let items;
  try {
    const r = await client.query(
      `SELECT oi.id, oi.product_id, oi.quantity,
              p.id AS p_id, p.product_source_type, p.external_provider,
              p.external_sku, p.external_product_id, p.fastrax_sku, p.fastrax_enabled, p.sku
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [oid],
    );
    items = r.rows;
  } catch (e) {
    return { ok: false, order_id: oid, error: e instanceof Error ? e.message : String(e) };
  }

  const skus = [];
  const qtds = [];
  const updateLineIds = [];
  for (const li of items || []) {
    const st = str(li.product_source_type).toLowerCase();
    const prov = str(li.external_provider).toLowerCase();
    const fxEn = li.fastrax_enabled === true;
    const isFx = st === "fastrax" || prov === FASTRAX_SOURCE || fxEn;
    if (!isFx) continue;
    const sku = pickExternalSku(li);
    if (!sku) {
      const msg = "Producto Fastrax sin SKU externo (external_sku/external_product_id/fastrax_sku/sku); no se envió.";
      await recordFailure(client, oid, msg, { reason: "missing_sku" }, null);
      return { ok: false, order_id: oid, error: msg };
    }
    const qty = Math.max(1, Math.floor(Number(li.quantity) || 1));
    skus.push(sku);
    qtds.push(String(qty));
    updateLineIds.push(li.id);
  }
  if (skus.length === 0) return { ok: true, skipped: true, reason: "no_fastrax_lines", order_id: oid };

  const fastraxPed = await resolveFastraxPed(client, oid, mapEx?.fastrax_ped);
  if (!fastraxPed || fastraxPed.length > FASTRAX_PED_MAX_LEN) {
    const msg = `Fastrax ped inválido (length=${fastraxPed?.length || 0}); debe ser ≤${FASTRAX_PED_MAX_LEN}`;
    await recordFailure(client, oid, msg, { reason: "ped_too_long", fastrax_ped: fastraxPed }, null);
    return { ok: false, order_id: oid, error: msg };
  }

  const payload = {
    ped: fastraxPed,
    sku: skus.join(","),
    qtd: qtds.join(","),
    gra: buildGra(skus),
    pgt: fastraxPgt(),
  };

  const ts0 = new Date().toISOString();
  await upsertMap(client, {
    order_id: oid,
    status: "syncing",
    fastrax_status: "pending",
    fastrax_ped: fastraxPed,
    payload,
    last_error: null,
    updated_at: ts0,
  });

  let r;
  try {
    r = await createFastraxRemoteOrder12(payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordFailure(client, oid, msg, null, payload);
    return { ok: false, order_id: oid, error: msg };
  }
  if (!r || r.ok === false) {
    const msg = String((r && (r.cestatus || r.message)) || "Fastrax ope=12 (negocio o HTTP)").slice(0, 2_000);
    await recordFailure(
      client,
      oid,
      msg,
      r && r.parsed && typeof r.parsed === "object" ? r.parsed : { message: msg },
      payload,
    );
    return { ok: false, order_id: oid, error: msg, cestatus: msg };
  }

  const { pdc, ped } = extractFastraxPedPdc(r.parsed, fastraxPed);
  if (!pdc) {
    const errText = "Fastrax: ope=12 ok pero sin pdc en respuesta; se guarda response.";
    await upsertMap(client, {
      order_id: oid,
      status: "failed",
      fastrax_status: "failed",
      fastrax_ped: ped,
      last_error: errText,
      response: r.parsed && typeof r.parsed === "object" ? r.parsed : { raw: r },
      updated_at: new Date().toISOString(),
    });
    return { ok: false, order_id: oid, error: errText };
  }

  const inv = await runFastraxAutoInvoiceOpe15(pdc, ped);
  const syncTs = new Date().toISOString();
  const autoInv = str(process.env.FASTRAX_AUTO_INVOICE).trim() === "1";
  const invoiceRes = autoInv
    ? (inv.parsed && typeof inv.parsed === "object" ? inv.parsed : { invoice_error: inv.message || "ope=15" })
    : null;

  await upsertMap(client, {
    order_id: oid,
    status: "succeeded",
    fastrax_status: "succeeded",
    fastrax_order_id: pdc,
    fastrax_ped: ped,
    fastrax_pdc: pdc,
    last_error: inv.ok ? null : String(inv.message || "ope=15").slice(0, 2_000),
    response: r.parsed && typeof r.parsed === "object" ? r.parsed : { ok: 1 },
    invoice_response: invoiceRes,
    last_sync_at: syncTs,
    updated_at: syncTs,
  });

  // Marcar líneas Fastrax: external_provider / external_sku / line_status.
  if (updateLineIds.length > 0) {
    try {
      await client.query(
        `UPDATE order_items
            SET external_provider = $1,
                external_sku      = CASE
                                      WHEN external_sku IS NULL OR external_sku = ''
                                      THEN COALESCE(
                                        (SELECT p.external_sku FROM products p WHERE p.id = order_items.product_id),
                                        (SELECT p.external_product_id FROM products p WHERE p.id = order_items.product_id),
                                        (SELECT p.fastrax_sku FROM products p WHERE p.id = order_items.product_id),
                                        (SELECT p.sku FROM products p WHERE p.id = order_items.product_id)
                                      )
                                      ELSE external_sku
                                    END,
                line_status       = 'ordered_in_fastrax'
          WHERE id = ANY($2::uuid[])`,
        [FASTRAX_SOURCE, updateLineIds],
      );
    } catch (e) {
      console.warn(`[fastrax/order] update order_items fail: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Mantener compat con 16: columnas en `orders`.
  try {
    await client.query(
      `UPDATE orders SET
          fastrax_order_pdc     = $2,
          fastrax_order_status  = 'succeeded',
          fastrax_order_raw     = $3::jsonb,
          fastrax_order_sent_at = COALESCE(fastrax_order_sent_at, now())
        WHERE id = $1`,
      [oid, pdc, r.parsed && typeof r.parsed === "object" ? JSON.stringify(r.parsed) : null],
    );
  } catch {
    // ignore — solo es snapshot legacy
  }

  return {
    ok: true,
    order_id: oid,
    fastrax_order_id: pdc,
    fastrax_pdc: pdc,
    fastrax_ped: ped,
    invoice_ok: inv.ok,
    invoice_error: inv.ok ? null : inv.message,
    context: options.context || "internal",
  };
}

/** ope=15 desde admin (botón "Facturar"). Idempotencia: si ya está facturado, devuelve invoice_response. */
export async function runFastraxInvoiceForMap(client, orderId) {
  const oid = str(orderId).trim();
  let mapRow;
  try {
    const r = await client.query("SELECT fastrax_pdc, fastrax_ped FROM fastrax_order_map WHERE order_id = $1 LIMIT 1", [oid]);
    mapRow = r.rows[0] || null;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!mapRow) return { ok: false, error: "no_map" };
  const pdc = str(mapRow.fastrax_pdc);
  const ped = str(mapRow.fastrax_ped) || oid;
  const r = pdc ? await fastraxInvoiceOrder15({ pdc }) : await fastraxInvoiceOrder15({ ped });
  const ts = new Date().toISOString();
  if (!r.ok) {
    const m = String(r.message || r.cestatus || "ope=15").slice(0, 2_000);
    await upsertMap(client, {
      order_id: oid,
      last_error: m,
      invoice_response: r.parsed && typeof r.parsed === "object" ? r.parsed : null,
      updated_at: ts,
    });
    return { ok: false, message: m, parsed: r.parsed };
  }
  await upsertMap(client, {
    order_id: oid,
    invoice_response: r.parsed && typeof r.parsed === "object" ? r.parsed : { ok: 1 },
    last_error: null,
    updated_at: ts,
  });
  return { ok: true, message: "invoiced", parsed: r.parsed };
}
