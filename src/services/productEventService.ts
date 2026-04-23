import { assertSupabaseConfigured, supabase } from "@/lib/supabase";
import { getOrCreateVisitorId } from "@/lib/visitorId";

export type ProductInterestEventType = "view" | "click" | "search_click";

/** Registra interés sin bloquear la UI; errores silenciados (sin Supabase / red). */
export async function recordProductEvent(
  productId: string,
  eventType: ProductInterestEventType,
  searchTerm?: string | null,
): Promise<void> {
  try {
    assertSupabaseConfigured();
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;

    const { error } = await supabase.rpc("record_product_event", {
      p_product_id: productId,
      p_event_type: eventType,
      p_search_term: searchTerm ?? null,
      p_visitor_id: visitorId,
    });

    if (error && import.meta.env.DEV) {
      console.warn("[productEvent]", error.message);
    }
  } catch {
    /* ignore */
  }
}
