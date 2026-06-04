// Domain types — mirror Supabase schema `enertech`.

export interface Category {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  categoryId: string | null;
  subcategoryId?: string | null;
  category?: Category | null;
  subcategory?: Category | null;
  name: string;
  slug: string;
  code?: string | null;
  sku?: string | null;
  brand?: string | null;
  supplier?: string | null;
  warehouse?: string | null;
  articleType?: string | null;
  situation?: string | null;
  rangeLabel?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  /** Entero 1–100 derivado de `compareAtPrice` vs `price`; null si no hay oferta real. */
  discountPercent?: number | null;
  stock: number;
  featured: boolean;
  isActive: boolean;
  /** Columna `products.image_url` (opcional); si existe, tiene prioridad sobre la 1ª fila en `product_images`. */
  imageUrl?: string | null;
  /** Prioridad en el slider del home (menor primero); solo aplica en productos destacados con imagen. */
  heroSlideOrder?: number | null;
  /** URL que ve el catálogo: `image_url` o primera imagen de galería. */
  mainImageUrl?: string | null;
  gallery: string[];
  createdAt?: string | null;
  specs: Record<string, string>;
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** Origen del producto: `enertech` (alta manual) o `fastrax` (importado del ERP). */
  source: "enertech" | "fastrax";
  /** Si está seteado, el producto está archivado (soft-delete). Solo aplica a Fastrax. */
  archivedAt?: string | null;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  stock: number;
}

export interface CheckoutCustomer {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  reference?: string;
  observations?: string;
}

export type OrderStatus =
  | "draft"
  | "sent_whatsapp"
  | "confirmed"
  | "cancelled"
  | "delivered";

export interface OrderConfirmation {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  whatsappUrl: string;
  total: number;
  itemsCount: number;
}

/** Campos esperados del Excel de importación (mapeo manual de columnas). */
export type ExcelCanonicalField =
  | "rango"
  | "codigo"
  | "descripcion"
  | "fecha"
  | "agrupacion"
  | "marca"
  | "deposito"
  | "proveedor"
  | "tipo_articulo"
  | "situacion"
  | "precio"
  | "stock"
  | "imagen"
  | "destacado"
  | "precio_tachado";
