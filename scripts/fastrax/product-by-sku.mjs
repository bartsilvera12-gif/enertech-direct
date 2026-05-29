#!/usr/bin/env node
/**
 * ope=2: detalle de producto(s) por SKU.
 * Uso: npm run fastrax:sku -- <sku1[,sku2,...]>
 */
import { fastraxConfigured, getProductDetails } from "./client.mjs";
import { extractProductRows, mapFastraxRowToProduct } from "./mapper.mjs";

async function main() {
  if (!fastraxConfigured()) {
    console.error("Fastrax no configurado (FASTRAX_* en .env.local).");
    process.exit(2);
  }
  const skuArg = (process.argv[2] || "").trim();
  if (!skuArg) {
    console.error("Uso: npm run fastrax:sku -- <sku1[,sku2,...]>");
    process.exit(2);
  }
  const r = await getProductDetails(skuArg.split(","));
  if (!r.ok) {
    console.error("[fastrax:sku] FALLÓ", { status: r.status, message: r.message || r.cestatus });
    process.exit(1);
  }
  const rows = extractProductRows(r._fastrax_data ?? r.parsed);
  console.log(`[fastrax:sku] ${rows.length} resultado(s) para "${skuArg}"`);
  for (const raw of rows) {
    console.log(JSON.stringify(mapFastraxRowToProduct(raw), null, 2));
  }
}

main().catch((e) => {
  console.error("[fastrax:sku] excepción:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
