import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
import { mapProduct, type ProductRow } from "@/lib/mapEnertech";
import { PRODUCT_EMBED } from "@/services/catalogService";
import type { Product } from "@/types";

export async function fetchProductsAdmin(): Promise<Product[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase.from("products").select(PRODUCT_EMBED).order("name", { ascending: true });
  if (error) throw error;
  return (data as ProductRow[]).map(mapProduct);
}

export type ProductUpsertInput = {
  name: string;
  slug: string;
  code?: string | null;
  sku?: string | null;
  category_id: string | null;
  subcategory_id?: string | null;
  brand?: string | null;
  supplier?: string | null;
  warehouse?: string | null;
  article_type?: string | null;
  situation?: string | null;
  range_label?: string | null;
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
  image_url?: string | null;
  hero_slide_order?: number | null;
  image_urls?: string[];
};

async function syncGalleryColumn(productId: string, urls: string[]) {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  const { error } = await supabase.from("products").update({ gallery: cleaned }).eq("id", productId);
  if (error) throw error;
}

async function replaceProductImages(productId: string, urls: string[]) {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  await syncGalleryColumn(productId, cleaned);
  const { error: delErr } = await supabase.from("product_images").delete().eq("product_id", productId);
  if (delErr) throw delErr;
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

function heroOrder(input: ProductUpsertInput): number | null {
  if (input.hero_slide_order === undefined || input.hero_slide_order === null) return null;
  const n = Number(input.hero_slide_order);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function buildInsertRow(input: ProductUpsertInput): Record<string, unknown> {
  const gallery = (input.image_urls ?? []).map((u) => u.trim()).filter(Boolean);
  const row: Record<string, unknown> = {
    name: input.name.trim(),
    slug: input.slug.trim(),
    code: input.code?.trim() || null,
    sku: input.sku?.trim() || null,
    category_id: input.category_id,
    subcategory_id: input.subcategory_id ?? null,
    brand: input.brand?.trim() || null,
    supplier: input.supplier?.trim() || null,
    warehouse: input.warehouse?.trim() || null,
    article_type: input.article_type?.trim() || null,
    situation: input.situation?.trim() || null,
    range_label: input.range_label?.trim() || null,
    short_description: input.short_description ?? null,
    description: input.description ?? null,
    image_url: input.image_url?.trim() || null,
    gallery,
    price: Math.round(input.price),
    compare_price: input.compare_at_price != null ? Math.round(input.compare_at_price) : null,
    stock: Math.max(0, Math.round(input.stock)),
    track_stock: true,
    is_featured: input.featured,
    is_active: input.is_active,
    specs: input.specs ?? {},
    meta_title: input.seo_title ?? null,
    meta_description: input.seo_description ?? null,
    hero_slide_order: heroOrder(input),
  };
  return row;
}

export async function createProductAdmin(input: ProductUpsertInput): Promise<Product> {
  assertSupabaseConfigured();
  const payload = buildInsertRow(input);
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
  if (input.code !== undefined) patch.code = input.code?.trim() || null;
  if (input.sku !== undefined) patch.sku = input.sku?.trim() || null;
  if (input.category_id !== undefined) patch.category_id = input.category_id;
  if (input.subcategory_id !== undefined) patch.subcategory_id = input.subcategory_id;
  if (input.brand !== undefined) patch.brand = input.brand?.trim() || null;
  if (input.supplier !== undefined) patch.supplier = input.supplier?.trim() || null;
  if (input.warehouse !== undefined) patch.warehouse = input.warehouse?.trim() || null;
  if (input.article_type !== undefined) patch.article_type = input.article_type?.trim() || null;
  if (input.situation !== undefined) patch.situation = input.situation?.trim() || null;
  if (input.range_label !== undefined) patch.range_label = input.range_label?.trim() || null;
  if (input.short_description !== undefined) patch.short_description = input.short_description;
  if (input.description !== undefined) patch.description = input.description;
  if (input.price !== undefined) patch.price = Math.round(input.price);
  if (input.compare_at_price !== undefined) {
    patch.compare_price = input.compare_at_price != null ? Math.round(input.compare_at_price) : null;
  }
  if (input.stock !== undefined) patch.stock = Math.max(0, Math.round(input.stock));
  if (input.featured !== undefined) patch.is_featured = input.featured;
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.specs !== undefined) patch.specs = input.specs ?? {};
  if (input.seo_title !== undefined) patch.meta_title = input.seo_title;
  if (input.seo_description !== undefined) patch.meta_description = input.seo_description;
  if (input.image_url !== undefined) patch.image_url = input.image_url?.trim() || null;
  if (input.hero_slide_order !== undefined) {
    patch.hero_slide_order =
      input.hero_slide_order === null || Number.isNaN(Number(input.hero_slide_order))
        ? null
        : Math.round(Number(input.hero_slide_order));
  }

  const { data, error } = await supabase.from("products").update(patch).eq("id", id).select(PRODUCT_EMBED).single();
  if (error) throw error;

  if (input.image_urls) {
    await replaceProductImages(id, input.image_urls);
    const { data: again, error: e2 } = await supabase.from("products").select(PRODUCT_EMBED).eq("id", id).single();
    if (e2) throw e2;
    return mapProduct(again as ProductRow);
  }

  return mapProduct(data as ProductRow);
}
