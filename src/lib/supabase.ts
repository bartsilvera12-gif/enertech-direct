import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** Único schema PostgreSQL expuesto por PostgREST para esta app (no usar `public` por defecto). */
export const SUPABASE_DB_SCHEMA = "enertech" as const;

/** Acepta host sin protocolo (ej. api.neura.com.py) y usa https por defecto. */
export function normalizeSupabaseUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

/** Debe apuntar al mismo proyecto PostgREST/Supabase cuya base contiene el schema `enertech` (misma instancia que usás con `SUPABASE_DB_URL` en scripts DBA). */
const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const configured = Boolean(rawUrl && anonKey);

/**
 * createClient() lanza si la URL está vacía ("supabaseUrl is required").
 * Sin .env usamos placeholders; las llamadas reales están acotadas por isSupabaseConfigured().
 */
const FALLBACK_URL = "http://127.0.0.1:54321";
const FALLBACK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjN43kdQwgnWNReilDMblYTn_I0";

/** Todas las llamadas `.from()` / `.rpc()` usan PostgREST con Accept-Profile / Content-Profile = enertech. Sin `global.headers` que pisen esos perfiles. */
export const supabase = createClient<any, typeof SUPABASE_DB_SCHEMA>(
  configured ? supabaseUrl : FALLBACK_URL,
  configured ? anonKey : FALLBACK_ANON,
  {
    auth: {
      persistSession: configured,
      autoRefreshToken: configured,
      detectSessionInUrl: configured,
    },
    db: {
      schema: SUPABASE_DB_SCHEMA,
    },
  },
);

export function isSupabaseConfigured(): boolean {
  return configured;
}

export function assertSupabaseConfigured(): void {
  if (!configured) {
    throw new Error("Supabase no configurado: definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY");
  }
}
