import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
import type { CartItem, CheckoutCustomer, OrderConfirmation } from "@/types";
import { getStoreWhatsappE164 } from "@/services/settingsService";

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
  if (customer.document) lines.push(`- Documento (CI/RUC): ${customer.document}`);
  if (customer.email) lines.push(`- Email: ${customer.email}`);
  lines.push(`- Ciudad: ${customer.city}`);
  lines.push(`- Dirección: ${customer.address}`);
  if (customer.reference) lines.push(`- Referencia: ${customer.reference}`);
  if (customer.observations) lines.push(`- Observaciones: ${customer.observations}`);
  return lines.join("\n");
}

export async function createWhatsAppOrder(
  items: CartItem[],
  customer: CheckoutCustomer,
): Promise<OrderConfirmation> {
  assertSupabaseConfigured();
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const lines = items.map((it) => ({
    product_id: it.productId,
    product_name: it.name,
    product_slug: it.slug,
    sku: it.sku,
    image_url: it.imageUrl,
    quantity: it.quantity,
    unit_price: it.price,
  }));

  const { data: rpcData, error: rpcErr } = await supabase.rpc("create_guest_order", {
    p_full_name: customer.fullName.trim(),
    p_phone: customer.phone.trim(),
    p_city: customer.city.trim(),
    p_address: customer.address.trim(),
    p_reference: customer.reference?.trim() ?? "",
    p_observations: customer.observations?.trim() ?? "",
    p_lines: lines,
    p_total: Math.round(total),
    p_email: customer.email?.trim() ?? "",
    p_document: customer.document?.trim() ?? "",
  });

  if (rpcErr) throw rpcErr;
  const payload = rpcData as { order_id?: string; order_number?: string } | null;
  // order_number es un bigint autoincremental; lo mostramos con prefijo de marca.
  const orderNumber = payload?.order_number ? `ENT-${payload.order_number}` : "ENT-000000";
  const orderId = payload?.order_id ?? crypto.randomUUID();

  const whatsappDigits = await getStoreWhatsappE164();
  if (!whatsappDigits) {
    throw new Error("Falta configurar whatsapp_e164 en enertech.store_settings");
  }

  const message = buildWhatsAppMessage(orderNumber, items, customer, total);
  const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;

  return {
    orderId,
    orderNumber,
    status: "sent_whatsapp",
    whatsappUrl,
    total,
    itemsCount: items.reduce((s, it) => s + it.quantity, 0),
  };
}
