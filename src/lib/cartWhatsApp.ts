import type { CartItem } from "@/types";
import { formatPYG } from "@/services/storeService";

/** Número usado en header cuando no hay settings en Supabase. */
export const DEFAULT_STORE_WHATSAPP_DIGITS = "595971472716";

export function buildCartWhatsAppMessage(items: CartItem[], total: number): string {
  const lines: string[] = [];
  lines.push("Hola, quiero consultar por estos productos:");
  lines.push("");
  items.forEach((item, i) => {
    const sku = item.sku?.trim() || "—";
    lines.push(`${i + 1}. ${item.name}`);
    lines.push(`SKU: ${sku}`);
    lines.push(`Cantidad: ${item.quantity}`);
    lines.push(`Precio: ${formatPYG(item.price)}`);
    lines.push(`Subtotal: ${formatPYG(item.price * item.quantity)}`);
    lines.push("");
  });
  lines.push(`Total estimado: ${formatPYG(total)}`);
  lines.push("");
  lines.push("Quedo atento/a.");
  return lines.join("\n");
}

export function buildCartWhatsAppUrl(digits: string, items: CartItem[], total: number): string {
  const d = digits.replace(/\D/g, "") || DEFAULT_STORE_WHATSAPP_DIGITS;
  const text = buildCartWhatsAppMessage(items, total);
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
