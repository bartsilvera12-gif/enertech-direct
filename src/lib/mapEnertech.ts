import type { Category, Product } from "@/types";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  alt: string | null;
};

export type ProductRow = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  featured: boolean;
  is_active: boolean;
  specs: Record<string, unknown> | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at?: string;
  categories?: CategoryRow | null;
  product_images?: ProductImageRow[] | null;
};

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function mapProduct(row: ProductRow): Product {
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const gallery = images.map((i) => i.url).filter(Boolean);
  const specsRaw = row.specs && typeof row.specs === "object" && !Array.isArray(row.specs) ? row.specs : {};
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(specsRaw)) {
    if (v !== null && v !== undefined) specs[k] = String(v);
  }

  return {
    id: row.id,
    categoryId: row.category_id,
    category: row.categories ? mapCategory(row.categories) : undefined,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    shortDescription: row.short_description,
    description: row.description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    stock: row.stock,
    featured: row.featured,
    isActive: row.is_active,
    mainImageUrl: gallery[0] ?? null,
    gallery,
    specs,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}
