#!/usr/bin/env node
/**
 * ope=13: consultar estado del pedido Fastrax y guardarlo en orders.fastrax_order_status/raw.
 * Consulta por pdc (si existe) o por ped (order_number).
 *
 * Uso: npm run fastrax:order-status -- <ENT-123456 | order_uuid>
 */
import { fastraxConfigured, queryFastraxOrderStatus13 } from "./client.mjs";
import { findFirstStringKeyDeep } from "./fastraxResponse.mjs";
import { withDb } from "./db.mjs";

async function main() {
  if (!fastraxConfigured()) {
    console.error("Fastrax no configurado (FASTRAX_* en .env.local).");
    process.exit(2);
  }
  const ref = (process.argv.slice(2).find((a) => !a.startsWith("--")) || "").trim();
  if (!ref) {
    console.error("Uso: npm run fastrax:order-status -- <ENT-123456 | order_uuid>");
    process.exit(2);
  }
  const byNumber = ref.toUpperCase().startsWith("ENT-");

  await withDb(async (client) => {
    const res = await client.query(
      byNumber
        ? "SELECT id, order_number, fastrax_order_pdc FROM orders WHERE order_number = $1 LIMIT 1"
        : "SELECT id, order_number, fastrax_order_pdc FROM orders WHERE id = $1 LIMIT 1",
      [ref],
    );
    const order = res.rows[0];
    if (!order) {
      console.error(`Pedido no encontrado: ${ref}`);
      process.exit(2);
    }

    const query = order.fastrax_order_pdc ? { pdc: order.fastrax_order_pdc } : { ped: order.order_number };
    const r = await queryFastraxOrderStatus13(query);
    if (!r.ok) {
      console.error("[fastrax:order-status] ope=13 FALLÓ:", r.message || r.cestatus);
      process.exit(1);
    }
    const data = r._fastrax_data ?? r.parsed;
    const status = findFirstStringKeyDeep(data, ["sit", "estado", "status", "est_ped", "situacion", "estatus_ped"]) || "desconocido";

    await client.query(
      "UPDATE orders SET fastrax_order_status = $2, fastrax_order_raw = $3::jsonb WHERE id = $1",
      [order.id, status, JSON.stringify(data ?? {})],
    );
    console.log("[fastrax:order-status]", { order: order.order_number, pdc: order.fastrax_order_pdc, status });
  });
}

main().catch((e) => {
  console.error("[fastrax:order-status] excepción:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
