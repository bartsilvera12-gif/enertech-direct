// Punto único para la tienda pública — catálogo Supabase schema `enertech`.

import type { OrderConfirmation, Product } from "@/types";
import type { CheckoutCustomer, CartItem } from "@/types";
export { fetchCategories, fetchProducts, fetchProductBySlug, fetchRelatedProducts } from "@/services/catalogService";
export { createWhatsAppOrder } from "@/services/orderService";

export function formatPYG(amount: number): string {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(amount);
}

/** Construye URL wa.me cuando ya tenés el número (p. ej. desde useStoreWhatsappDigits). */
export function formatProductWhatsAppHref(product: Product, whatsappDigits: string): string {
  const lines = [
    "Hola Enertech, me interesa este producto:",
    `- ${product.name}`,
    product.sku ? `- SKU: ${product.sku}` : null,
    `- Precio: ${formatPYG(product.price)}`,
    `${typeof window !== "undefined" ? window.location.origin : ""}/product/${product.slug}`,
  ].filter(Boolean);
  const base = whatsappDigits.replace(/\D/g, "") ? `https://wa.me/${whatsappDigits.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(lines.join("\n"))}`;
}
