// Domain types — mirror eventual Express/Supabase contracts.
// This layer is the contract; swap services/* implementation later for real API.

export interface Category {
  id: string;
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
  category?: Category | null;
  name: string;
  slug: string;
  sku?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  featured: boolean;
  isActive: boolean;
  mainImageUrl?: string | null;
  gallery: string[];
  specs: Record<string, string>;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
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
