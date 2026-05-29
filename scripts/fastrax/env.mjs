/**
 * Carga .env.local y .env en process.env para los scripts CLI Fastrax.
 * Prioridad: process.env existente > .env.local > .env. NUNCA versionar secretos.
 * Los FASTRAX_* viven solo acá (server-side); jamás en el bundle Vite ni como VITE_*.
 */
import fs from "node:fs";
import path from "node:path";

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

let loaded = false;
export function loadFastraxEnv() {
  if (loaded) return;
  loaded = true;
  const cwd = process.cwd();
  const fromEnv = parseEnvFile(path.join(cwd, ".env"));
  const fromLocal = parseEnvFile(path.join(cwd, ".env.local"));
  for (const [k, v] of Object.entries({ ...fromEnv, ...fromLocal })) {
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}
