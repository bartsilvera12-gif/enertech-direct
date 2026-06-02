/**
 * ope=13: sincroniza estado del pedido Fastrax → `enertech.fastrax_order_map`.
 *
 * Prioriza `pdc` (id Fastrax); si no hay, usa `ped` (referencia ecommerce).
 * Persiste `fastrax_sit`, `fastrax_status_code`, `fastrax_status_label`,
 * `last_sync_at`, y `response` cruda.
 */
import { queryFastraxOrderStatus13, fastraxConfigured, fastraxEnabled } from "./client.mjs";
import { pickSitCode, sitToLabel } from "./mapper.mjs";

function str(x) {
  if (x == null) return "";
  return String(x);
}

/**
 * @param {import('pg').Client} client
 * @param {string} orderId
 */
export async function syncFastraxOrderStatusForOrderId(client, orderId) {
  if (!fastraxEnabled()) return { ok: false, reason: "fastrax_disabled" };
  if (!fastraxConfigured()) return { ok: false, reason: "not_configured" };
  const oid = str(orderId).trim();
  if (!oid) return { ok: false, reason: "no_order_id" };

  let map;
  try {
    const r = await client.query(
      "SELECT id, fastrax_pdc, fastrax_ped FROM fastrax_order_map WHERE order_id = $1 LIMIT 1",
      [oid],
    );
    map = r.rows[0] || null;
  } catch (e) {
    return { ok: false, order_id: oid, reason: "load_error", error: e instanceof Error ? e.message : String(e) };
  }
  if (!map) return { ok: false, order_id: oid, reason: "no_map" };

  const pdc = str(map.fastrax_pdc).trim();
  const ped = str(map.fastrax_ped).trim() || oid;
  const body = pdc ? { pdc } : { ped };
  const r0 = await queryFastraxOrderStatus13(body);
  const lastSync = new Date().toISOString();

  if (!r0 || r0.ok === false) {
    const errMsg = str(r0 && (r0.message || r0.cestatus)) || "ope=13 error";
    try {
      await client.query(
        `UPDATE fastrax_order_map
            SET last_error = $2,
                response   = COALESCE($3::jsonb, response),
                updated_at = now()
          WHERE order_id = $1`,
        [
          oid,
          errMsg.slice(0, 2_000),
          r0 && r0.parsed && typeof r0.parsed === "object" ? JSON.stringify(r0.parsed) : null,
        ],
      );
    } catch {
      // ignore
    }
    return { ok: false, order_id: oid, reason: "fastrax_api_error", error: errMsg };
  }

  const sit = pickSitCode(r0.parsed);
  const codeNum = sit != null && !Number.isNaN(Number(sit)) ? Math.floor(Number(sit)) : null;
  const label = sitToLabel(sit, null);

  try {
    await client.query(
      `UPDATE fastrax_order_map
          SET response             = COALESCE($2::jsonb, response),
              fastrax_sit          = $3,
              fastrax_status_code  = $4,
              fastrax_status_label = $5,
              fastrax_status       = 'synced',
              last_sync_at         = now(),
              last_error           = NULL,
              updated_at           = now()
        WHERE order_id = $1`,
      [
        oid,
        r0.parsed && typeof r0.parsed === "object" ? JSON.stringify(r0.parsed) : null,
        sit != null ? str(sit) : null,
        codeNum,
        label,
      ],
    );
  } catch (e) {
    return { ok: false, order_id: oid, reason: "save_error", error: e instanceof Error ? e.message : String(e) };
  }

  // Mantener compat con 16: columnas en `orders`.
  try {
    await client.query(
      `UPDATE orders SET fastrax_order_status = $2, fastrax_order_raw = COALESCE($3::jsonb, fastrax_order_raw) WHERE id = $1`,
      [oid, `synced:${label || codeNum || ""}`, r0.parsed && typeof r0.parsed === "object" ? JSON.stringify(r0.parsed) : null],
    );
  } catch {
    // ignore
  }

  return {
    ok: true,
    order_id: oid,
    fastrax_pdc: pdc || null,
    fastrax_ped: ped,
    sit,
    fastrax_status_code: codeNum,
    label,
    last_sync_at: lastSync,
  };
}
