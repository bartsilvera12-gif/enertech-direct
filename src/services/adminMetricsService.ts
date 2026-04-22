import { supabase, assertSupabaseConfigured } from "@/lib/supabase";

export const LOW_STOCK_THRESHOLD = 5;

export async function fetchAdminDashboardMetrics(): Promise<{
  productsActiveCount: number;
  productsTotalCount: number;
  categoriesActiveCount: number;
  ordersCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  catalogValueGs: number;
  totalStockUnits: number;
  lowStockProducts: { id: string; name: string; stock: number }[];
}> {
  assertSupabaseConfigured();

  const [
    activeRes,
    totalRes,
    catRes,
    ordRes,
    lowStockCountRes,
    lowRows,
    outRes,
    valueRows,
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("stock", 0)
      .lte("stock", LOW_STOCK_THRESHOLD),
    supabase
      .from("products")
      .select("id,name,stock")
      .eq("is_active", true)
      .gt("stock", 0)
      .lte("stock", LOW_STOCK_THRESHOLD)
      .order("stock", { ascending: true })
      .limit(25),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true).lte("stock", 0),
    supabase.from("products").select("price,stock").eq("is_active", true),
  ]);

  if (activeRes.error) throw activeRes.error;
  if (totalRes.error) throw totalRes.error;
  if (catRes.error) throw catRes.error;
  if (ordRes.error) throw ordRes.error;
  if (lowStockCountRes.error) throw lowStockCountRes.error;
  if (lowRows.error) throw lowRows.error;
  if (outRes.error) throw outRes.error;
  if (valueRows.error) throw valueRows.error;

  let catalogValueGs = 0;
  let totalStockUnits = 0;
  for (const row of valueRows.data ?? []) {
    const p = row as { price: number; stock: number };
    catalogValueGs += Number(p.price) * Number(p.stock);
    totalStockUnits += Number(p.stock);
  }

  return {
    productsActiveCount: activeRes.count ?? 0,
    productsTotalCount: totalRes.count ?? 0,
    categoriesActiveCount: catRes.count ?? 0,
    ordersCount: ordRes.count ?? 0,
    lowStockCount: lowStockCountRes.count ?? 0,
    outOfStockCount: outRes.count ?? 0,
    catalogValueGs,
    totalStockUnits,
    lowStockProducts: (lowRows.data ?? []) as { id: string; name: string; stock: number }[],
  };
}
