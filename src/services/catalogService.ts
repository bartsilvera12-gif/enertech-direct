import { isSupabaseConfigured, supabase, assertSupabaseConfigured } from "@/lib/supabase";
import { mapCategory, mapProduct, type CategoryRow, type ProductRow } from "@/lib/mapEnertech";
import type { Category, Product } from "@/types";

/** FK explícitos: mismo origen `categories` para categoría y subcategoría. */
export const PRODUCT_EMBED = `
  *,
  category:categories!category_id (*),
  subcategory:categories!subcategory_id (*),
  product_images (*)
`;

export type CatalogSort = "newest" | "price_asc" | "price_desc" | "name_asc" | "code_asc";

export type CatalogFilters = {
  categorySlug?: string;
  subcategorySlug?: string;
  brand?: string;
  supplier?: string;
  warehouse?: string;
  articleType?: string;
  situation?: string;
  search?: string;
  featuredOnly?: boolean;
  sort?: CatalogSort;
};

export async function fetchCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return [];
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as CategoryRow[]).map(mapCategory);
}

/** Categorías raíz (sin padre). */
export function rootCategories(all: Category[]): Category[] {
  return all.filter((c) => !c.parentId);
}

/** Subcategorías de un padre (por slug de padre). */
export function childrenOfParentSlug(all: Category[], parentSlug: string): Category[] {
  const parent = all.find((c) => c.slug === parentSlug);
  if (!parent) return [];
  return all.filter((c) => c.parentId === parent.id);
}

export type CatalogFacets = {
  brands: string[];
  suppliers: string[];
  warehouses: string[];
  situations: string[];
  articleTypes: string[];
};

export async function fetchCatalogFacets(): Promise<CatalogFacets> {
  if (!isSupabaseConfigured()) {
    return { brands: [], suppliers: [], warehouses: [], situations: [], articleTypes: [] };
  }
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("products")
    .select("brand,supplier,warehouse,situation,article_type")
    .eq("is_active", true);
  if (error) throw error;
  const brands = new Set<string>();
  const suppliers = new Set<string>();
  const warehouses = new Set<string>();
  const situations = new Set<string>();
  const articleTypes = new Set<string>();
  for (const row of data ?? []) {
    const r = row as Record<string, string | null>;
    if (r.brand?.trim()) brands.add(r.brand.trim());
    if (r.supplier?.trim()) suppliers.add(r.supplier.trim());
    if (r.warehouse?.trim()) warehouses.add(r.warehouse.trim());
    if (r.situation?.trim()) situations.add(r.situation.trim());
    if (r.article_type?.trim()) articleTypes.add(r.article_type.trim());
  }
  const sortSet = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, "es"));
  return {
    brands: sortSet(brands),
    suppliers: sortSet(suppliers),
    warehouses: sortSet(warehouses),
    situations: sortSet(situations),
    articleTypes: sortSet(articleTypes),
  };
}

export async function fetchProducts(opts?: CatalogFilters): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  assertSupabaseConfigured();

  let q = supabase.from("products").select(PRODUCT_EMBED).eq("is_active", true);

  if (opts?.featuredOnly) q = q.eq("featured", true);

  let categoryId: string | undefined;
  let subcategoryId: string | undefined;

  if (opts?.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (cat?.id) categoryId = cat.id;
    else return [];
  }

  if (opts?.subcategorySlug) {
    const { data: sub } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.subcategorySlug)
      .eq("is_active", true)
      .maybeSingle();
    if (sub?.id) subcategoryId = sub.id;
    else return [];
  }

  if (categoryId) q = q.eq("category_id", categoryId);
  if (subcategoryId) q = q.eq("subcategory_id", subcategoryId);

  if (opts?.brand) q = q.eq("brand", opts.brand);
  if (opts?.supplier) q = q.eq("supplier", opts.supplier);
  if (opts?.warehouse) q = q.eq("warehouse", opts.warehouse);
  if (opts?.articleType) q = q.eq("article_type", opts.articleType);
  if (opts?.situation) q = q.eq("situation", opts.situation);

  const sort = opts?.sort ?? "newest";
  if (sort === "price_asc") q = q.order("price", { ascending: true });
  else if (sort === "price_desc") q = q.order("price", { ascending: false });
  else if (sort === "name_asc") q = q.order("name", { ascending: true });
  else if (sort === "code_asc") q = q.order("code", { ascending: true });
  else q = q.order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) throw error;
  let list = (data as ProductRow[]).map(mapProduct);

  if (opts?.search) {
    const s = opts.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.slug.toLowerCase().includes(s) ||
        (p.sku?.toLowerCase().includes(s) ?? false) ||
        (p.code?.toLowerCase().includes(s) ?? false) ||
        (p.brand?.toLowerCase().includes(s) ?? false),
    );
  }

  return list;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) return null;
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
  if (!isSupabaseConfigured()) return [];
  assertSupabaseConfigured();
  if (!product.categoryId && !product.subcategoryId) return [];
  let q = supabase
    .from("products")
    .select(PRODUCT_EMBED)
    .eq("is_active", true)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (product.subcategoryId) {
    q = q.eq("subcategory_id", product.subcategoryId);
  } else if (product.categoryId) {
    q = q.eq("category_id", product.categoryId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as ProductRow[]).map(mapProduct);
}

const withImage = (p: Product) => Boolean(p.mainImageUrl);

/**
 * Hasta `limit` productos con imagen: prioriza destacados, completa con los más recientes.
 * Debe alimentar el carrusel del hero (siempre datos reales, no hardcode).
 */
export async function fetchHeroSliderProducts(limit = 5): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];
  assertSupabaseConfigured();
  const cap = 50;
  const { data: feat, error: e1 } = await supabase
    .from("products")
    .select(PRODUCT_EMBED)
    .eq("is_active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (e1) throw e1;

  let out = (feat as ProductRow[]).map(mapProduct).filter(withImage);
  if (out.length >= limit) return out.slice(0, limit);

  const { data: recent, error: e2 } = await supabase
    .from("products")
    .select(PRODUCT_EMBED)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(cap);
  if (e2) throw e2;

  const ids = new Set(out.map((p) => p.id));
  for (const row of recent ?? []) {
    if (out.length >= limit) break;
    const p = mapProduct(row as ProductRow);
    if (!ids.has(p.id) && withImage(p)) {
      out.push(p);
      ids.add(p.id);
    }
  }

  return out.slice(0, limit);
}
