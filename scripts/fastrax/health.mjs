#!/usr/bin/env node
/**
 * ope=10: versión / health check de Fastrax.
 * Uso: npm run fastrax:health
 * No imprime credenciales. Si Fastrax rechaza IP/credenciales/usuario, lo reporta y sale != 0.
 */
import { fastraxConfigured, getVersion } from "./client.mjs";

async function main() {
  if (!fastraxConfigured()) {
    console.error("Fastrax no configurado: definí FASTRAX_API_URL, FASTRAX_COD y FASTRAX_PASS en .env.local");
    process.exit(2);
  }
  const r = await getVersion();
  if (!r.ok) {
    console.error("[fastrax:health] FALLÓ", { status: r.status, message: r.message || r.cestatus || "error" });
    process.exit(1);
  }
  console.log("[fastrax:health] OK", { status: r.status });
  console.log("Respuesta (sin secretos):", JSON.stringify(r._fastrax_data ?? r.parsed, null, 2));
}

main().catch((e) => {
  console.error("[fastrax:health] excepción:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
