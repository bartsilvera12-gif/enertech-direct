import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
import { mapCategory, mapProduct, type CategoryRow, type ProductRow } from "@/lib/mapEnertech";
import type { Category, Product } from "@/types";

const PRODUCT_EMBED = `
  *,
  categories (*),
  product_images (*)
`;

export async function fetchCategoriesAdmin(): Promise<Category[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as CategoryRow[]).map(mapCategory);
}

export async function fetchProductsAdmin(): Promise<Product[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.from("products").select(PRODUCT_EMBED).order("name", { ascending: true });
  if (error) throw error;
  return (data as ProductRow[]).map(mapProduct);
}

export type ProductUpsertInput = {
  name: string;
  slug: string;
  sku?: string | null;
  category_id: string | null;
  short_description?: string | null;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  featured: boolean;
  is_active: boolean;
  specs?: Record<string, string>;
  seo_title?: string | null;
  seo_description?: string | null;
  image_urls?: string[];
};

async function replaceProductImages(productId: string, urls: string[]) {
  const { error: delErr } = await supabase.from("product_images").delete().eq("product_id", productId);
  if (delErr) throw delErr;
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  const rows = cleaned.map((url, sort_order) => ({
    product_id: productId,
    url,
    sort_order,
    alt: null as string | null,
  }));
  const { error: insErr } = await supabase.from("product_images").insert(rows);
  if (insErr) throw insErr;
}

export async function createProductAdmin(input: ProductUpsertInput): Promise<Product> {
  assertSupabaseConfigured();
  const payload = {
    name: input.name.trim(),
    slug: input.slug.trim(),
    sku: input.sku?.trim() || null,
    category_id: input.category_id,
    short_description: input.short_description ?? null,
    description: input.description ?? null,
    price: Math.round(input.price),
    compare_at_price: input.compare_at_price != null ? Math.round(input.compare_at_price) : null,
    stock: Math.max(0, Math.round(input.stock)),
    featured: input.featured,
    is_active: input.is_active,
    specs: input.specs ?? {},
    seo_title: input.seo_title ?? null,
    seo_description: input.seo_description ?? null,
  };
  const { data, error } = await supabase.from("products").insert(payload).select(PRODUCT_EMBED).single();
  if (error) throw error;
  const row = data as ProductRow;
  if (input.image_urls?.length) {
    await replaceProductImages(row.id, input.image_urls);
    const { data: again, error: e2 } = await supabase.from("products").select(PRODUCT_EMBED).eq("id", row.id).single();
    if (e2) throw e2;
    return mapProduct(again as ProductRow);
  }
  return mapProduct(row);
}

export async function updateProductAdmin(id: string, input: Partial<ProductUpsertInput>): Promise<Product> {
  assertSupabaseConfigured();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.slug !== undefined) patch.slug = input.slug.trim();
  if (input.sku !== undefined) patch.sku = input.sku?.trim() || null;
  if (input.category_id !== undefined) patch.category_id = input.category_id;
  if (input.short_description !== undefined) patch.short_description = input.short_description;
  if (input.description !== undefined) patch.description = input.description;
  if (input.price !== undefined) patch.price = Math.round(input.price);
  if (input.compare_at_price !== undefined) patch.compare_at_price = input.compare_at_price != null ? Math.round(input.compare_at_price) : null;
  if (input.stock !== undefined) patch.stock = Math.max(0, Math.round(input.stock));
  if (input.featured !== undefined) patch.featured = input.featured;
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.specs !== undefined) patch.specs = input.specs;
  if (input.seo_title !== undefined) patch.seo_title = input.seo_title;
  if (input.seo_description !== undefined) patch.seo_description = input.seo_description;

  const { data, error } = await supabase.from("products").update(patch).eq("id", id).select(PRODUCT_EMBED).single();
  if (error) throw error;
  const row = data as ProductRow;
  if (input.image_urls) {
    await replaceProductImages(id, input.image_urls);
    const { data: again, error: e2 } = await supabase.from("products").select(PRODUCT_EMBED).eq("id", id).single();
    if (e2) throw e2;
    return mapProduct(again as ProductRow);
  }
  return mapProduct(row);
}
