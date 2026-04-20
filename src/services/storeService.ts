// Service layer — single point to swap for real Express API later.
// Each function mimics an HTTP fetch with a tiny delay so the UI behaves real.

import type { Category, OrderConfirmation, Product, CartItem, CheckoutCustomer } from "@/types";
import { demoCategories, demoProducts } from "@/data/demo";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export async function fetchCategories(): Promise<Category[]> {
  await delay();
  return demoCategories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function fetchProducts(opts?: {
  categorySlug?: string;
  featuredOnly?: boolean;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
}): Promise<Product[]> {
  await delay();
  let list = demoProducts.filter((p) => p.isActive);
  if (opts?.featuredOnly) list = list.filter((p) => p.featured);
  if (opts?.categorySlug) {
    const cat = demoCategories.find((c) => c.slug === opts.categorySlug);
    if (cat) list = list.filter((p) => p.categoryId === cat.id);
  }
  if (opts?.search) {
    const q = opts.search.toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  switch (opts?.sort) {
    case "price_asc": list = [...list].sort((a, b) => a.price - b.price); break;
    case "price_desc": list = [...list].sort((a, b) => b.price - a.price); break;
    default: break;
  }
  return list;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  await delay();
  return demoProducts.find((p) => p.slug === slug && p.isActive) ?? null;
}

export async function fetchRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  await delay(120);
  return demoProducts
    .filter((p) => p.isActive && p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, limit);
}

// ---- Checkout: in real life this hits POST /api/store/checkout/whatsapp ----

const WHATSAPP_NUMBER = "595981000000"; // TODO: replace with real Enertech number

function generateOrderNumber(): string {
  const n = Math.floor(Math.random() * 999999);
  return `ENT-${String(n).padStart(6, "0")}`;
}

function formatPYG(amount: number): string {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(amount);
}

function buildWhatsAppMessage(orderNumber: string, items: CartItem[], customer: CheckoutCustomer, total: number): string {
  const lines: string[] = [];
  lines.push(`Hola Enertech, quiero confirmar este pedido:`);
  lines.push("");
  lines.push(`Pedido: ${orderNumber}`);
  lines.push("");
  lines.push("Productos:");
  for (const it of items) {
    lines.push(`- ${it.name} x${it.quantity} — ${formatPYG(it.price * it.quantity)}`);
  }
  lines.push("");
  lines.push(`Total: ${formatPYG(total)}`);
  lines.push("");
  lines.push("Datos del cliente:");
  lines.push(`- Nombre: ${customer.fullName}`);
  lines.push(`- Teléfono: ${customer.phone}`);
  lines.push(`- Ciudad: ${customer.city}`);
  lines.push(`- Dirección: ${customer.address}`);
  if (customer.reference) lines.push(`- Referencia: ${customer.reference}`);
  if (customer.observations) lines.push(`- Observaciones: ${customer.observations}`);
  return lines.join("\n");
}

export async function createWhatsAppOrder(
  items: CartItem[],
  customer: CheckoutCustomer
): Promise<OrderConfirmation> {
  await delay(400);
  // NOTE: in production, this is the Express endpoint that recalculates prices server-side.
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const orderNumber = generateOrderNumber();
  const message = buildWhatsAppMessage(orderNumber, items, customer, total);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  return {
    orderId: crypto.randomUUID(),
    orderNumber,
    status: "sent_whatsapp",
    whatsappUrl,
    total,
    itemsCount: items.reduce((s, it) => s + it.quantity, 0),
  };
}

export function buildProductWhatsAppUrl(product: Product): string {
  const lines = [
    "Hola Enertech, me interesa este producto:",
    `- ${product.name}`,
    product.sku ? `- SKU: ${product.sku}` : null,
    `- Precio: ${formatPYG(product.price)}`,
    `${window.location.origin}/product/${product.slug}`,
  ].filter(Boolean);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export { formatPYG };
