/**
 * Despachador automático de pedidos a Fastrax (ope=12).
 *
 * Problema que resuelve: cuando un cliente finaliza su compra en el storefront,
 * se crea el pedido en `enertech.orders` (RPC create_guest_order). Este worker
 * detecta esos pedidos nuevos que tienen líneas Fastrax y los envía al ERP
 * llamando a `createFastraxOrderForInternalOrder` — la MISMA función idempotente
 * que usa el botón manual del admin. No hay endpoint público ni el navegador
 * toca Fastrax: todo ocurre server-side con las credenciales de .env.local.
 *
 * Por qué polling (y no un webhook de Supabase): el Supabase self-hosted de este
 * proyecto no tiene `pg_net`/`http`, así que no puede hacer POST desde la DB.
 * Un poll sobre la conexión `pg` directa que ya usamos (withDb) no depende de
 * ninguna extensión, sobrevive reinicios (retoma pedidos pendientes) y la
 * unicidad de `fastrax_order_map(order_id)` evita duplicados.
 *
 * SEGURIDAD — doble cerrojo (igual que la ruta admin):
 *   - `FASTRAX_AUTO_DISPATCH=1`         → habilita este worker.
 *   - `FASTRAX_CREATE_REMOTE_ORDERS=1`  → habilita el envío REAL a Fastrax.
 *   Si AUTO_DISPATCH=1 pero CREATE_REMOTE_ORDERS=0 corre en DRY-RUN: detecta y
 *   loguea los pedidos que despacharía, pero NO llama a Fastrax. Útil para
 *   validar el enganche sin generar pedidos reales.
 *
 * Config opcional:
 *   FASTRAX_AUTO_DISPATCH_INTERVAL_MS   (default 15000, mín 5000)
 *   FASTRAX_AUTO_DISPATCH_LOOKBACK_HOURS(default 72)  → acota el scan a pedidos recientes
 *   FASTRAX_AUTO_DISPATCH_BATCH         (default 10)   → máx pedidos por tick
 */
import { withDb } from "../scripts/fastrax/db.mjs";
import { createFastraxOrderForInternalOrder } from "../scripts/fastrax/createOrderForInternal.mjs";
import { fastraxConfigured } from "../scripts/fastrax/client.mjs";
import { FASTRAX_SOURCE } from "../scripts/fastrax/mapper.mjs";

function envFlag(key) {
  return String(process.env[key] ?? "0").trim() === "1";
}

function intEnv(key, def, min, max) {
  const n = Math.floor(Number(process.env[key]));
  if (!Number.isFinite(n)) return def;
  let v = n;
  if (min != null) v = Math.max(min, v);
  if (max != null) v = Math.min(max, v);
  return v;
}

/**
 * Pedidos candidatos: recientes, con al menos una línea Fastrax, y sin fila en
 * `fastrax_order_map` (ni éxito ni fallo previo). Los que fallaron quedan con
 * map='failed' y se reintentan a mano desde /admin/fastrax/pedidos (evita
 * martillar Fastrax en loop con un pedido roto).
 */
async function selectPendingOrders(client, { lookbackHours, batch }) {
  const res = await client.query(
    `SELECT o.id
       FROM orders o
      WHERE o.created_at > now() - make_interval(hours => $1)
        AND NOT EXISTS (SELECT 1 FROM fastrax_order_map m WHERE m.order_id = o.id)
        AND EXISTS (
          SELECT 1
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = o.id
             AND (
               p.product_source_type = 'fastrax'
               OR p.external_provider = $2
               OR p.fastrax_enabled = true
             )
        )
      ORDER BY o.created_at ASC
      LIMIT $3`,
    [lookbackHours, FASTRAX_SOURCE, batch],
  );
  return res.rows.map((r) => r.id);
}

async function runTick({ realSend, lookbackHours, batch }) {
  return withDb(async (client) => {
    const ids = await selectPendingOrders(client, { lookbackHours, batch });
    if (ids.length === 0) return { scanned: 0, sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;
    for (const orderId of ids) {
      if (!realSend) {
        console.log(`[fastrax-dispatch] DRY-RUN: despacharía pedido ${orderId} (FASTRAX_CREATE_REMOTE_ORDERS=0).`);
        continue;
      }
      try {
        const r = await createFastraxOrderForInternalOrder(client, orderId, { context: "auto" });
        if (r?.ok && !r.skipped) {
          sent += 1;
          console.log(`[fastrax-dispatch] pedido ${orderId} → Fastrax OK (pdc=${r.fastrax_pdc || "?"}, ped=${r.fastrax_ped || "?"}).`);
        } else if (r?.ok && r.skipped) {
          console.log(`[fastrax-dispatch] pedido ${orderId} omitido (${r.reason}).`);
        } else {
          failed += 1;
          console.warn(`[fastrax-dispatch] pedido ${orderId} FALLÓ: ${r?.error || "desconocido"}. Reintento manual desde /admin.`);
        }
      } catch (e) {
        failed += 1;
        console.error(`[fastrax-dispatch] excepción en pedido ${orderId}:`, e instanceof Error ? e.message : String(e));
      }
    }
    return { scanned: ids.length, sent, failed };
  });
}

/**
 * Arranca el worker de despacho. Idempotente: si no está habilitado o Fastrax no
 * está configurado, no hace nada y devuelve `false`. Devuelve `true` si quedó
 * corriendo (útil para logs de arranque del server).
 */
export function startFastraxOrderDispatcher() {
  if (!envFlag("FASTRAX_AUTO_DISPATCH")) {
    return false;
  }
  if (!fastraxConfigured()) {
    console.warn("[fastrax-dispatch] FASTRAX_AUTO_DISPATCH=1 pero Fastrax no está configurado; worker no arranca.");
    return false;
  }

  const intervalMs = intEnv("FASTRAX_AUTO_DISPATCH_INTERVAL_MS", 15_000, 5_000, 600_000);
  const lookbackHours = intEnv("FASTRAX_AUTO_DISPATCH_LOOKBACK_HOURS", 72, 1, 24 * 30);
  const batch = intEnv("FASTRAX_AUTO_DISPATCH_BATCH", 10, 1, 100);
  const realSend = envFlag("FASTRAX_CREATE_REMOTE_ORDERS");

  console.log(
    `[fastrax-dispatch] worker ON — intervalo=${intervalMs}ms, lookback=${lookbackHours}h, batch=${batch}, ` +
      `modo=${realSend ? "ENVÍO REAL" : "DRY-RUN (FASTRAX_CREATE_REMOTE_ORDERS=0)"}.`,
  );

  let running = false;
  const tick = async () => {
    if (running) return; // no solapar ticks: un scan lento no dispara otro en paralelo
    running = true;
    try {
      const r = await runTick({ realSend, lookbackHours, batch });
      if (r.scanned > 0) {
        console.log(`[fastrax-dispatch] tick: ${r.scanned} pendiente(s), ${r.sent} enviado(s), ${r.failed} fallo(s).`);
      }
    } catch (e) {
      console.error("[fastrax-dispatch] tick error:", e instanceof Error ? e.message : String(e));
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === "function") timer.unref(); // no impedir que el proceso cierre
  // Primer barrido tras un pequeño delay para no competir con el arranque del server.
  setTimeout(tick, 3_000).unref?.();
  return true;
}
