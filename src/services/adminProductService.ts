import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
import { mapProduct, type ProductRow } from "@/lib/mapEnertech";
import { PRODUCT_EMBED } from "@/services/catalogService";
import type { Product } from "@/types";
import {
  COMPARE_COLUMNS,
  FEATURED_COLUMNS,
  detectProductsSchemaSupport,
  isMissingColumnError,
  stripFields,
  type ProductsSchemaSupport,
} from "@/lib/productsSchemaSupport";

function applyCompareFields(
  target: Record<string, unknown>,
  compareRounded: number | null,
  support: ProductsSchemaSupport,
): void {
  stripFields(target, COMPARE_COLUMNS);
  if (support.compareAt) target.compare_at_price = compareRounded;
  if (support.comparePrice) target.compare_price = compareRounded;
}

function applyFeaturedFields(
  target: Record<string, unknown>,
  featured: boolean,
  support: ProductsSchemaSupport,
): void {
  stripFields(target, FEATURED_COLUMNS);
  if (support.featured) target.featured = featured;
  if (support.isFeatured) target.is_featured = featured;
}

export async function fetchProductsAdmin(opts?: { includeArchived?: boolean }): Promise<Product[]> {
  assertSupabaseConfigured();
  let q = supabase.from("products").select(PRODUCT_EMBED).order("name", { ascending: true });
  if (!opts?.includeArchived) {
    // archived_at IS NULL incluye filas viejas que no tienen la columna seteada.
    q = q.is("archived_at", null);
  }
  const { data, error } = await q;
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

/** Sincroniza `gallery` en products + filas en product_images (uso admin e importación). */
export async function replaceProductImages(productId: string, urls: string[]) {
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

function buildInsertRow(
  input: ProductUpsertInput,
  support: ProductsSchemaSupport,
): Record<string, unknown> {
  const gallery = (input.image_urls ?? []).map((u) => u.trim()).filter(Boolean);
  const compareRounded = input.compare_at_price != null ? Math.round(input.compare_at_price) : null;
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
    stock: Math.max(0, Math.round(input.stock)),
    track_stock: true,
    is_active: input.is_active,
    specs: input.specs ?? {},
    meta_title: input.seo_title ?? null,
    meta_description: input.seo_description ?? null,
    hero_slide_order: heroOrder(input),
  };
  applyCompareFields(row, compareRounded, support);
  applyFeaturedFields(row, input.featured, support);
  return row;
}

/**
 * Ejecuta una mutación (insert/update) y, si falla por columnas legacy
 * (compare_* o featured/is_featured) ausentes en el schema cache de PostgREST,
 * limpia el payload y reintenta. Itera hasta que no haya error de columna o
 * el payload quede sin más columnas problemáticas.
 */
async function runWithSchemaFallback<T>(
  payload: Record<string, unknown>,
  exec: () => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
): Promise<{ data: T | null; error: { code?: string; message?: string } | null }> {
  let res = await exec();
  for (let attempt = 0; attempt < 3 && res.error; attempt++) {
    if (isMissingColumnError(res.error, COMPARE_COLUMNS)) {
      stripFields(payload, COMPARE_COLUMNS);
    } else if (isMissingColumnError(res.error, FEATURED_COLUMNS)) {
      stripFields(payload, FEATURED_COLUMNS);
    } else {
      break;
    }
    res = await exec();
  }
  return res;
}

export async function createProductAdmin(input: ProductUpsertInput): Promise<Product> {
  assertSupabaseConfigured();
  const support = await detectProductsSchemaSupport();
  const payload = buildInsertRow(input, support);

  const res = await runWithSchemaFallback<ProductRow>(payload, () =>
    supabase.from("products").insert(payload).select(PRODUCT_EMBED).single(),
  );
  if (res.error) throw res.error;

  const row = res.data as ProductRow;
  if (input.image_urls?.length) {
    await replaceProductImages(row.id, input.image_urls);
    const { data: again, error: e2 } = await supabase.from("products").select(PRODUCT_EMBED).eq("id", row.id).single();
    if (e2) throw e2;
    return mapProduct(again as ProductRow);
  }
  return mapProduct(row);
}

/**
 * Elimina un producto. Para productos Fastrax hace soft-delete (archived_at =
 * now, is_active = false) preservando imágenes, ediciones locales y vínculos
 * con order_items. Para productos manuales (Enertech) hace borrado físico.
 */
export async function deleteProductAdmin(id: string): Promise<void> {
  assertSupabaseConfigured();

  // 1) Detectar origen del producto
  const { data: row, error: readErr } = await supabase
    .from("products")
    .select("id, product_source_type, external_provider")
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw readErr;

  const isFastrax =
    (row?.product_source_type as string | undefined) === "fastrax" ||
    (row?.external_provider as string | undefined) === "fastrax";

  if (isFastrax) {
    // 2a) Soft delete: archivar + desactivar. No tocamos product_images ni
    //     order_items para preservar referencias.
    const { error } = await supabase
      .from("products")
      .update({ archived_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
    if (error) throw error;
    return;
  }

  // 2b) Hard delete para productos manuales (igual que antes)
  const { error: imgErr } = await supabase.from("product_images").delete().eq("product_id", id);
  if (imgErr && imgErr.code !== "PGRST116") throw imgErr;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/** Restaura un producto archivado (Fastrax). Limpia archived_at; deja is_active=false para que el admin lo revise. */
export async function restoreProductAdmin(id: string): Promise<void> {
  assertSupabaseConfigured();
  const { error } = await supabase.from("products").update({ archived_at: null }).eq("id", id);
  if (error) throw error;
}

export async function updateProductAdmin(id: string, input: Partial<ProductUpsertInput>): Promise<Product> {
  assertSupabaseConfigured();
  const support = await detectProductsSchemaSupport();
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
    const cr = input.compare_at_price != null ? Math.round(input.compare_at_price) : null;
    applyCompareFields(patch, cr, support);
  }
  if (input.stock !== undefined) patch.stock = Math.max(0, Math.round(input.stock));
  if (input.featured !== undefined) {
    applyFeaturedFields(patch, input.featured, support);
  }
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

  const res = await runWithSchemaFallback<ProductRow>(patch, () =>
    supabase.from("products").update(patch).eq("id", id).select(PRODUCT_EMBED).single(),
  );
  if (res.error) throw res.error;

  if (input.image_urls) {
    await replaceProductImages(id, input.image_urls);
    const { data: again, error: e2 } = await supabase.from("products").select(PRODUCT_EMBED).eq("id", id).single();
    if (e2) throw e2;
    return mapProduct(again as ProductRow);
  }

  return mapProduct(res.data as ProductRow);
}
