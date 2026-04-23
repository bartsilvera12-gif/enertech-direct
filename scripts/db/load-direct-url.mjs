/**
 * URL PostgreSQL para migraciones DBA.
 * Prioridad: SUPABASE_DB_URL (owner/supabase_admin) → DIRECT_POSTGRES_URL (pooler).
 * Variables en process.env o en .env.local (no versionar secretos).
 */
import fs from "node:fs";
import path from "node:path";

const KEYS_PRIORITY = ["SUPABASE_DB_URL", "DIRECT_POSTGRES_URL"];

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
    if (val) out[key] = val;
  }
  return out;
}

export function loadMigrationPostgresUrl() {
  const fromFile = parseEnvFile(path.join(process.cwd(), ".env.local"));
  for (const key of KEYS_PRIORITY) {
    const v = process.env[key]?.trim() || fromFile[key]?.trim();
    if (v) return v;
  }
  throw new Error(
    "Definí SUPABASE_DB_URL o DIRECT_POSTGRES_URL en el entorno o en .env.local (ver .env.example).",
  );
}

/** @deprecated usar loadMigrationPostgresUrl; misma prioridad. */
export function loadDirectPostgresUrl() {
  return loadMigrationPostgresUrl();
}
