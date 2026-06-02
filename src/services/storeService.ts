// Punto único para la tienda pública — catálogo Supabase schema `enertech`.

import type { OrderConfirmation, Product } from "@/types";
import type { CheckoutCustomer, CartItem } from "@/types";
export {
  fetchCategories,
  fetchProducts,
  fetchProductBySlug,
  fetchRelatedProducts,
  fetchHeroSliderProducts,
  fetchCatalogFacets,
  rootCategories,
  childrenOfParentSlug,
  PRODUCT_EMBED,
  type CatalogFacets,
  type CatalogFilters,
  type CatalogSort,
} from "@/services/catalogService";
export { createWhatsAppOrder } from "@/services/orderService";

export function formatPYG(amount: number): string {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(amount);
}

export { deriveDiscountPercent } from "@/lib/pricing";

/** Consulta por WhatsApp — mensaje según briefing comercial. */
export function formatProductWhatsAppHref(product: Product, whatsappDigits: string): string {
  const text = `Hola, quiero consultar por el producto ${product.name}`;
  const base = whatsappDigits.replace(/\D/g, "") ? `https://wa.me/${whatsappDigits.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
