#!/usr/bin/env node
/**
 * CLI: sincroniza saldo/precio Fastrax (ope=11) → fastrax_stock / fastrax_price (envoltura sobre sync-core.mjs).
 * NO toca stock/price curados del admin. DRY-RUN por defecto; --apply para escribir.
 *
 * Uso:
 *   npm run fastrax:stock                       # todos los productos fastrax_enabled (dry-run)
 *   npm run fastrax:stock -- --sku 185,186      # solo esos SKUs
 *   npm run fastrax:stock -- --apply
 */
import { fastraxConfigured } from "./client.mjs";
import { runStockSync } from "./sync-core.mjs";

function parseArgs(argv) {
  const a = { apply: false, batch: 50, skus: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--apply") a.apply = true;
    else if (t === "--sku") a.skus = String(argv[++i] || "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (t === "--batch") a.batch = Math.max(1, Math.min(200, Math.floor(Number(argv[++i]) || 50)));
  }
  return a;
}

async function main() {
  if (!fastraxConfigured()) {
    console.error("Fastrax no configurado (FASTRAX_* en .env.local).");
    process.exit(2);
  }
  const opts = parseArgs(process.argv.slice(2));
  console.log("[fastrax:stock]", { apply: opts.apply, batch: opts.batch, mode: opts.apply ? "APPLY" : "DRY-RUN" });

  const { stats } = await runStockSync(opts, (msg) => console.log(`[fastrax:stock] ${msg}`));

  console.log("[fastrax:stock] resultado:", stats);
  if (!opts.apply) console.log("DRY-RUN: nada escrito. Repetí con --apply para confirmar.");
}

main().catch((e) => {
  console.error("[fastrax:stock] excepción:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
