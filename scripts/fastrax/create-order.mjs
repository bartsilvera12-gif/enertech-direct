#!/usr/bin/env node
/**
 * ope=12: enviar un pedido LOCAL de Enertech a Fastrax.
 *
 * SEGURIDAD (doble cerrojo): solo envía de verdad si
 *    FASTRAX_CREATE_REMOTE_ORDERS=1   Y   se pasa --confirm.
 * En cualquier otro caso es DRY-RUN: arma e imprime el payload (sin credenciales) y no envía.
 *
 * Idempotencia: si el pedido ya tiene fastrax_order_pdc o fastrax_order_sent_at, no se reenvía.
 * El envío real "reclama" el pedido (sent_at) en una sola UPDATE condicional para evitar doble click.
 *
 * Contrato Fastrax: ped = order_number (id único ecommerce), sku/qtd separados por coma y
 * alineados, gra vacío por item, pgt = FASTRAX_PGT (default 3 Otros).
 *
 * Uso:
 *   npm run fastrax:order -- <ENT-123456 | order_uuid>            # dry-run
 *   npm run fastrax:order -- ENT-123456 --confirm                 # real (requiere env =1)
 */
import {
  fastraxConfigured,
  createFastraxRemoteOrder12,
  getStockPrice,
  fastraxPgt,
  fastraxInvoiceOrder15,
} from "./client.mjs";
import { extractFastraxPedPdc } from "./fastraxResponse.mjs";
import { extractProductRows, mapFastraxRowToProduct } from "./mapper.mjs";
import { withDb } from "./db.mjs";

function envFlag(key) {
  return String(process.env[key] ?? "0").trim() === "1";
}

async function loadOrder(client, ref) {
  const byNumber = ref.toUpperCase().startsWith("ENT-");
  const sql = byNumber
    ? "SELECT id, order_number, fastrax_order_pdc, fastrax_order_sent_at FROM orders WHERE order_number = $1 LIMIT 1"
    : "SELECT id, order_number, fastrax_order_pdc, fastrax_order_sent_at FROM orders WHERE id = $1 LIMIT 1";
  const res = await client.query(sql, [ref]);
  return res.rows[0] || null;
}

async function loadLines(client, orderId) {
  const res = await client.query(
    `SELECT oi.quantity, oi.product_name, p.fastrax_sku, p.fastrax_enabled
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at`,
    [orderId],
  );
  return res.rows;
}

async function main() {
  if (!fastraxConfigured()) {
    console.error("Fastrax no configurado (FASTRAX_* en .env.local).");
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const ref = (args.find((a) => !a.startsWith("--")) || "").trim();
  if (!ref) {
    console.error("Uso: npm run fastrax:order -- <ENT-123456 | order_uuid> [--confirm]");
    process.exit(2);
  }
  const willSend = confirm && envFlag("FASTRAX_CREATE_REMOTE_ORDERS");

  await withDb(async (client) => {
    const order = await loadOrder(client, ref);
    if (!order) {
      console.error(`Pedido no encontrado: ${ref}`);
      process.exit(2);
    }
    if (order.fastrax_order_pdc || order.fastrax_order_sent_at) {
      console.log("[fastrax:order] YA ENVIADO (idempotencia):", {
        order: order.order_number,
        pdc: order.fastrax_order_pdc,
        sent_at: order.fastrax_order_sent_at,
      });
      return;
    }

    const lines = await loadLines(client, order.id);
    const fxLines = lines.filter((l) => l.fastrax_sku && String(l.fastrax_sku).trim());
    const skipped = lines.filter((l) => !l.fastrax_sku);
    if (skipped.length) {
      console.warn(`[fastrax:order] ${skipped.length} item(s) SIN fastrax_sku (se omiten):`, skipped.map((s) => s.product_name));
    }
    if (fxLines.length === 0) {
      console.error("[fastrax:order] el pedido no tiene items Fastrax (fastrax_sku). Nada que enviar.");
      process.exit(2);
    }

    const skus = fxLines.map((l) => String(l.fastrax_sku).trim());
    const payload = {
      ped: order.order_number,
      sku: skus.join(","),
      qtd: fxLines.map((l) => Math.max(1, Math.floor(Number(l.quantity) || 1))).join(","),
      gra: skus.map(() => "").join(","),
      pgt: fastraxPgt(),
    };

    // Pre-chequeo saldo/precio (informativo, no bloqueante).
    try {
      const chk = await getStockPrice({ sku: skus.join(",") });
      if (chk.ok) {
        const bySku = new Map(
          extractProductRows(chk._fastrax_data ?? chk.parsed).map(mapFastraxRowToProduct).filter(Boolean).map((m) => [m.fastrax_sku, m]),
        );
        for (const l of fxLines) {
          const m = bySku.get(String(l.fastrax_sku).trim());
          if (!m) console.warn(`  [aviso] SKU ${l.fastrax_sku} sin datos en ope=11`);
          else if (m.stock != null && m.stock < Number(l.quantity)) console.warn(`  [aviso] SKU ${l.fastrax_sku}: saldo ${m.stock} < pedido ${l.quantity}`);
        }
      }
    } catch { /* el pre-chequeo no debe frenar el flujo */ }

    console.log("[fastrax:order] payload ope=12 (sin credenciales):", JSON.stringify(payload, null, 2));

    if (!willSend) {
      console.log(
        "DRY-RUN: no se envió. Para enviar de verdad: FASTRAX_CREATE_REMOTE_ORDERS=1 en .env.local Y pasar --confirm.",
      );
      return;
    }

    // Reclamo idempotente: solo un proceso puede marcar sent_at.
    const claim = await client.query(
      "UPDATE orders SET fastrax_order_sent_at = now() WHERE id = $1 AND fastrax_order_sent_at IS NULL AND fastrax_order_pdc IS NULL RETURNING id",
      [order.id],
    );
    if (claim.rowCount === 0) {
      console.log("[fastrax:order] otro envío ya reclamó este pedido; abortando para no duplicar.");
      return;
    }

    const r = await createFastraxRemoteOrder12(payload);
    if (!r.ok) {
      // Liberar el reclamo para permitir reintento; guardar el error.
      await client.query(
        "UPDATE orders SET fastrax_order_sent_at = NULL, fastrax_order_status = 'error', fastrax_order_raw = $2::jsonb WHERE id = $1",
        [order.id, JSON.stringify({ message: r.message || r.cestatus || "error", status: r.status })],
      );
      console.error("[fastrax:order] ope=12 FALLÓ:", r.message || r.cestatus);
      process.exit(1);
    }

    const { pdc } = extractFastraxPedPdc(r._fastrax_data ?? r.parsed, order.order_number);
    await client.query(
      "UPDATE orders SET fastrax_order_pdc = $2, fastrax_order_status = 'sent', fastrax_order_raw = $3::jsonb WHERE id = $1",
      [order.id, pdc, JSON.stringify(r._fastrax_data ?? r.parsed ?? {})],
    );
    console.log("[fastrax:order] ENVIADO OK", { order: order.order_number, pdc });

    if (envFlag("FASTRAX_AUTO_INVOICE")) {
      const inv = await fastraxInvoiceOrder15(pdc ? { pdc } : { ped: order.order_number });
      console.log("[fastrax:order] ope=15 facturación:", inv.ok ? "OK" : `FALLÓ: ${inv.message || inv.cestatus}`);
    }
  });
}

main().catch((e) => {
  console.error("[fastrax:order] excepción:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
