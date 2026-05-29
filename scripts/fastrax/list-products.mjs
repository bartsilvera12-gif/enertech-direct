#!/usr/bin/env node
/**
 * ope=4: listado paginado de productos Fastrax (para descubrir SKUs de prueba).
 * Uso: npm run fastrax:list -- [page] [size]
 *   npm run fastrax:list -- 1 25
 * Imprime SKUs + nombre; no vuelca todo el payload ni credenciales.
 */
import { fastraxConfigured, listFastraxProductsOpe4 } from "./client.mjs";
import { extractProductRows, mapFastraxRowToProduct } from "./mapper.mjs";

async function main() {
  if (!fastraxConfigured()) {
    console.error("Fastrax no configurado (FASTRAX_* en .env.local).");
    process.exit(2);
  }
  const page = Math.max(1, Math.floor(Number(process.argv[2]) || 1));
  const size = Math.max(1, Math.min(500, Math.floor(Number(process.argv[3]) || 25)));

  const r = await listFastraxProductsOpe4(page, size);
  if (!r.ok) {
    console.error("[fastrax:list] FALLÓ", { status: r.status, message: r.message || r.cestatus });
    process.exit(1);
  }
  const rows = extractProductRows(r._fastrax_data ?? r.parsed);
  console.log(`[fastrax:list] page=${page} size=${size} → ${rows.length} filas`);
  for (const raw of rows) {
    const m = mapFastraxRowToProduct(raw);
    if (m) console.log(`  ${m.fastrax_sku}\t${m.name}\tstock=${m.stock ?? "?"}\tprice=${m.price ?? "?"}`);
  }
}

main().catch((e) => {
  console.error("[fastrax:list] excepción:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
