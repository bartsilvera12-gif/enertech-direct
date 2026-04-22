import { useQuery } from "@tanstack/react-query";
import { getStoreWhatsappE164 } from "@/services/settingsService";
import { isSupabaseConfigured } from "@/lib/supabase";

export function useStoreWhatsappDigits() {
  return useQuery({
    queryKey: ["store-settings", "whatsapp_e164"],
    queryFn: () => getStoreWhatsappE164(),
    staleTime: 3600_000,
    retry: 1,
    enabled: isSupabaseConfigured(),
  });
}
