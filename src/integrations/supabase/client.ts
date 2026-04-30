import { createClient } from "@supabase/supabase-js";

/**
 * Único `createClient` del proyecto: PostgREST expone el schema `enertech` (no `public`).
 * Importar siempre desde aquí o desde `@/lib/supabase` (re-export).
 */
export const SUPABASE_DB_SCHEMA = "enertech" as const;

export function normalizeSupabaseUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

const supabaseUrl = normalizeSupabaseUrl(rawUrl);
const configured = Boolean(rawUrl && anonKey);

const FALLBACK_URL = "http://127.0.0.1:54321";
const FALLBACK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjN43kdQwgnWNReilDMblYTn_I0";

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
