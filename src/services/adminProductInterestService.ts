import { assertSupabaseConfigured, supabase } from "@/lib/supabase";

export type AdminTopProductRow = {
  productId: string;
  productSlug: string;
  productName: string;
  sku: string;
  categoryLabel: string;
  views: number;
  clicks: number;
  searchClicks: number;
  totalInteractions: number;
};

type RpcRow = {
  product_id: string;
  product_slug: string;
  product_name: string;
  sku: string | null;
  category_label: string | null;
  views: number | string;
  clicks: number | string;
  search_clicks: number | string;
  total_interactions: number | string;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/** Top productos del mes calendario en curso (zona servidor). Solo admin autenticado. */
export async function fetchAdminTopProductsCurrentMonth(limit = 10): Promise<AdminTopProductRow[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.rpc("admin_top_products_current_month", {
    p_limit: limit,
  });

  if (error) throw error;

  const rows = (data ?? []) as RpcRow[];
  return rows.map((r) => ({
    productId: r.product_id,
    productSlug: r.product_slug,
    productName: r.product_name,
    sku: r.sku?.trim() || "—",
    categoryLabel: r.category_label?.trim() || "—",
    views: num(r.views),
    clicks: num(r.clicks),
    searchClicks: num(r.search_clicks),
    totalInteractions: num(r.total_interactions),
  }));
}
