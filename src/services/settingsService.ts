import { supabase, assertSupabaseConfigured } from "@/lib/supabase";

export async function getStoreWhatsappE164(): Promise<string> {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "whatsapp_e164")
    .maybeSingle();
  if (error) throw error;
  const v = data?.value;
  if (typeof v === "string") return v.replace(/\D/g, "");
  if (v && typeof v === "object" && "digits" in v && typeof (v as { digits: string }).digits === "string") {
    return (v as { digits: string }).digits.replace(/\D/g, "");
  }
  return "";
}
