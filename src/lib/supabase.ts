import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

/** Cliente PostgREST limitado al schema `enertech` (una sola tienda). */
export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: "enertech",
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no configurado: definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY");
  }
}
