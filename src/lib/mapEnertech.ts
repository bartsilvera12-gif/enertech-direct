import type { Category, Product } from "@/types";
import { deriveDiscountPercent } from "@/lib/pricing";



export type CategoryRow = {

  id: string;

  parent_id?: string | null;

  name: string;

  slug: string;

  description: string | null;

  image_url: string | null;

  is_active: boolean;

  sort_order?: number;

};



export type ProductImageRow = {

  id: string;

  product_id: string;

  url: string;

  sort_order: number;

  alt: string | null;

};



/** Fila PostgREST: tolera esquema “ideal” del repo y variantes live (is_featured, compare_price, meta_*). */

export type ProductRow = {

  id: string;

  category_id: string | null;

  subcategory_id?: string | null;

  image_url?: string | null;

  code?: string | null;

  brand?: string | null;

  supplier?: string | null;

  warehouse?: string | null;

  article_type?: string | null;

  situation?: string | null;

  range_label?: string | null;

  name: string;

  slug: string;

  sku: string | null;

  short_description: string | null;

  description: string | null;

  price: number;

  compare_at_price?: number | null;

  compare_price?: number | null;

  stock: number;

  featured?: boolean;

  is_featured?: boolean;

  is_active: boolean;

  specs?: Record<string, unknown> | null;

  seo_title?: string | null;

  seo_description?: string | null;

  meta_title?: string | null;

  meta_description?: string | null;

  created_at?: string;

  gallery?: unknown;

  categories?: CategoryRow | CategoryRow[] | null;

  category?: CategoryRow | CategoryRow[] | null;

  subcategory?: CategoryRow | CategoryRow[] | null;

  product_images?: ProductImageRow[] | null;

  hero_slide_order?: number | null;

  product_source_type?: string | null;

  external_provider?: string | null;

  archived_at?: string | null;

};



export function mapCategory(row: CategoryRow): Category {

  return {

    id: row.id,

    parentId: row.parent_id ?? null,

    name: row.name,

    slug: row.slug,

    description: row.description,

    imageUrl: row.image_url,

    isActive: row.is_active,

    sortOrder: row.sort_order ?? 0,

  };

}



function parseCategoryEmbed(raw: CategoryRow | CategoryRow[] | null | undefined): CategoryRow | undefined {

  if (raw == null) return undefined;

  if (Array.isArray(raw)) {

    const first = raw[0];

    return first && typeof first === "object" && "id" in first ? first : undefined;

  }

  return typeof raw === "object" && "id" in raw ? raw : undefined;

}



function galleryFromJsonb(raw: unknown): string[] {

  if (!Array.isArray(raw)) return [];

  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);

}



export function mapProduct(row: ProductRow): Product {

  const rawImages = row.product_images;

  const imageList = Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages as unknown as ProductImageRow] : [];

  const images = [...imageList].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  const galleryFromRelation = images.map((i) => i.url).filter(Boolean);

  const galleryFromColumn = galleryFromJsonb(row.gallery);

  const gallery = galleryFromRelation.length > 0 ? galleryFromRelation : galleryFromColumn;



  const primaryFromColumn = row.image_url?.trim() || null;

  const specsRaw = row.specs && typeof row.specs === "object" && !Array.isArray(row.specs) ? row.specs : {};

  const specs: Record<string, string> = {};

  for (const [k, v] of Object.entries(specsRaw)) {

    if (v !== null && v !== undefined) specs[k] = String(v);

  }



  const catEmbed =

    parseCategoryEmbed(row.category) ??

    parseCategoryEmbed(row.categories);



  const subEmbed = parseCategoryEmbed(row.subcategory);



  const featured = row.featured === true || row.is_featured === true;

  const compare =

    row.compare_at_price != null && row.compare_at_price !== undefined

      ? Number(row.compare_at_price)

      : row.compare_price != null && row.compare_price !== undefined

        ? Number(row.compare_price)

        : null;

  const priceNum = Number(row.price);

  const discountPercent = deriveDiscountPercent(priceNum, compare);



  return {

    id: row.id,

    categoryId: row.category_id,

    subcategoryId: row.subcategory_id ?? null,

    category: catEmbed ? mapCategory(catEmbed) : undefined,

    subcategory: subEmbed ? mapCategory(subEmbed) : undefined,

    name: row.name,

    slug: row.slug,

    code: row.code ?? null,

    sku: row.sku,

    brand: row.brand ?? null,

    supplier: row.supplier ?? null,

    warehouse: row.warehouse ?? null,

    articleType: row.article_type ?? null,

    situation: row.situation ?? null,

    rangeLabel: row.range_label ?? null,

    shortDescription: row.short_description,

    description: row.description,

    price: priceNum,

    compareAtPrice: compare,

    discountPercent,

    stock: row.stock,

    featured,

    isActive: row.is_active,

    imageUrl: primaryFromColumn,

    heroSlideOrder: row.hero_slide_order ?? null,

    mainImageUrl: (primaryFromColumn || gallery[0]) ?? null,

    gallery,

    createdAt: row.created_at ?? null,

    specs,

    seoTitle: row.seo_title ?? row.meta_title ?? null,

    seoDescription: row.seo_description ?? row.meta_description ?? null,

    source:
      row.product_source_type === "fastrax" || row.external_provider === "fastrax"
        ? "fastrax"
        : "enertech",

    archivedAt: row.archived_at ?? null,

  };

}


