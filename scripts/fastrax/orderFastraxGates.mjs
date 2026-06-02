/**
 * Determina si un pedido tiene líneas Fastrax (gate para mostrar el botón
 * "Enviar a Fastrax" en el admin y para evitar llamadas innecesarias a ope=12).
 */
import { FASTRAX_SOURCE } from "./mapper.mjs";

/**
 * @param {import('pg').Client} client
 * @param {string} orderId
 * @returns {Promise<{ok:boolean, reason?:string, fastraxItemCount?:number}>}
 */
export async function orderCanFulfillFastrax(client, orderId) {
  const oid = String(orderId || "").trim();
  if (!oid) return { ok: false, reason: "no_order" };

  let res;
  try {
    res = await client.query(
      `SELECT COUNT(*)::int AS n
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1
          AND (
            p.product_source_type = 'fastrax'
            OR p.external_provider = $2
            OR p.fastrax_enabled = true
          )`,
      [oid, FASTRAX_SOURCE],
    );
  } catch (e) {
    return { ok: false, reason: "products_query_error", error: e instanceof Error ? e.message : String(e) };
  }
  const n = Number(res.rows[0]?.n || 0);
  if (n <= 0) return { ok: false, reason: "no_fastrax_lines", fastraxItemCount: 0 };
  return { ok: true, fastraxItemCount: n };
}
