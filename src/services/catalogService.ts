import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
import { mapCategory, mapProduct, type CategoryRow, type ProductRow } from "@/lib/mapEnertech";
import type { Category, Product } from "@/types";

const PRODUCT_EMBED = `
  *,
  categories (*),
  product_images (*)
`;

export async function fetchCategories(): Promise<Category[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as CategoryRow[]).map(mapCategory);
}

export async function fetchProducts(opts?: {
  categorySlug?: string;
  featuredOnly?: boolean;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
}): Promise<Product[]> {
  assertSupabaseConfigured();
  let q = supabase.from("products").select(PRODUCT_EMBED).eq("is_active", true);

  if (opts?.featuredOnly) q = q.eq("featured", true);

  if (opts?.categorySlug) {
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (catErr) throw catErr;
    if (cat?.id) q = q.eq("category_id", cat.id);
    else return [];
  }

  if (opts?.sort === "price_asc") q = q.order("price", { ascending: true });
  else if (opts?.sort === "price_desc") q = q.order("price", { ascending: false });
  else q = q.order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  let list = (data as ProductRow[]).map(mapProduct);

  if (opts?.search) {
    const s = opts.search.toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s));
  }

  return list;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_EMBED)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapProduct(data as ProductRow);
}

export async function fetchRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  assertSupabaseConfigured();
  if (!product.categoryId) return [];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_EMBED)
    .eq("is_active", true)
    .eq("category_id", product.categoryId)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as ProductRow[]).map(mapProduct);
}
