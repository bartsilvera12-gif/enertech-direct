#!/usr/bin/env node
/**
 * CLI: sincroniza catálogo Fastrax → enertech.products (envoltura sobre sync-core.mjs).
 *
 * ope=4 es índice liviano (sku+saldo+crc); el detalle real (nombre/precio) viene de ope=2.
 * Productos NUEVOS entran inactivos y no destacados. DRY-RUN por defecto; --apply para escribir.
 *
 * Uso:
 *   npm run fastrax:sync                       # dry-run, página 1, size 50
 *   npm run fastrax:sync -- --page 2 --size 100
 *   npm run fastrax:sync -- --all --max-pages 10
 *   npm run fastrax:sync -- --all --apply
 */
import { fastraxConfigured } from "./client.mjs";
import { runProductSync } from "./sync-core.mjs";

function parseArgs(argv) {
  const a = { page: 1, size: 50, all: false, maxPages: 20, apply: false, detailBatch: 20 };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--apply") a.apply = true;
    else if (t === "--all") a.all = true;
    else if (t === "--page") a.page = Math.max(1, Math.floor(Number(argv[++i]) || 1));
    else if (t === "--size") a.size = Math.max(1, Math.min(500, Math.floor(Number(argv[++i]) || 50)));
    else if (t === "--max-pages") a.maxPages = Math.max(1, Math.floor(Number(argv[++i]) || 20));
    else if (t === "--detail-batch") a.detailBatch = Math.max(1, Math.min(100, Math.floor(Number(argv[++i]) || 20)));
  }
  return a;
}

async function main() {
  if (!fastraxConfigured()) {
    console.error("Fastrax no configurado (FASTRAX_* en .env.local).");
    process.exit(2);
  }
  const opts = parseArgs(process.argv.slice(2));
  console.log("[fastrax:sync]", { ...opts, mode: opts.apply ? "APPLY (escribe)" : "DRY-RUN (no escribe)" });

  const { stats, preview } = await runProductSync(opts, (msg) => console.log(`[fastrax:sync] ${msg}`));

  if (preview.length) {
    console.log("[fastrax:sync] muestra de productos a INSERTAR (inactivos, no destacados):");
    console.table(preview);
  }
  console.log("[fastrax:sync] resultado:", stats);
  if (!opts.apply) console.log("DRY-RUN: nada escrito. Repetí con --apply para confirmar.");
}

main().catch((e) => {
  console.error("[fastrax:sync] excepción:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
