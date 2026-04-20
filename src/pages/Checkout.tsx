import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { createWhatsAppOrder, formatPYG } from "@/services/storeService";
import type { CheckoutCustomer, OrderConfirmation } from "@/types";
import { toast } from "sonner";

const fields: { key: keyof CheckoutCustomer; label: string; required: boolean; type?: string; textarea?: boolean; placeholder?: string }[] = [
  { key: "fullName", label: "Nombre completo", required: true, placeholder: "Juan Pérez" },
  { key: "phone", label: "Teléfono", required: true, type: "tel", placeholder: "0991 000 000" },
  { key: "city", label: "Ciudad", required: true, placeholder: "Asunción" },
  { key: "address", label: "Dirección", required: true, placeholder: "Av. Ejemplo 123" },
  { key: "reference", label: "Referencia (opcional)", required: false, placeholder: "Casa gris portón negro" },
  { key: "observations", label: "Observaciones (opcional)", required: false, textarea: true, placeholder: "Llamar antes de entregar" },
];

const Checkout = () => {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CheckoutCustomer>({
    fullName: "", phone: "", city: "", address: "", reference: "", observations: "",
  });

  const total = subtotal();

  if (items.length === 0) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-semibold">No hay productos en el carrito</h1>
        <Link to="/catalog" className="text-primary mt-4 inline-block">Ver catálogo</Link>
      </div>
    );
  }

  const update = (key: keyof CheckoutCustomer, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) {
        toast.error(`${f.label} es obligatorio`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const result: OrderConfirmation = await createWhatsAppOrder(items, form);
      // Open WhatsApp in new tab
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      // Persist for confirmation page
      sessionStorage.setItem("enertech-last-order", JSON.stringify(result));
      clear();
      navigate("/order/sent");
    } catch (err) {
      toast.error("No pudimos generar tu pedido. Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-12 md:py-16">
      <Link to="/cart" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="size-3.5" /> Volver al carrito
      </Link>

      <header className="mb-10">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Checkout</span>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-2">Confirmar pedido</h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Completá tus datos. Al confirmar, te redirigimos a WhatsApp con el resumen del pedido para coordinar pago y entrega.
        </p>
      </header>

      <form onSubmit={onSubmit} className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 rounded-3xl bg-surface hairline p-6 md:p-8 space-y-5">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Datos de contacto</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
                <label className="block text-xs text-muted-foreground mb-2">
                  {f.label} {f.required && <span className="text-primary">*</span>}
                </label>
                {f.textarea ? (
                  <textarea
                    value={form[f.key] ?? ""}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                    className="w-full bg-background hairline rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                ) : (
                  <input
                    type={f.type ?? "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                    className="w-full bg-background hairline rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-3xl bg-surface hairline p-6 lg:sticky lg:top-24 space-y-5">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Resumen</h2>
          <ul className="space-y-3 text-sm max-h-72 overflow-y-auto pr-1">
            {items.map((it) => (
              <li key={it.productId} className="flex justify-between gap-3">
                <span className="truncate text-foreground/90">
                  {it.name} <span className="text-muted-foreground">×{it.quantity}</span>
                </span>
                <span className="price-tabular shrink-0">{formatPYG(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-white/5 pt-4 flex justify-between items-baseline">
            <span className="text-sm uppercase tracking-widest">Total</span>
            <span className="text-2xl font-semibold text-primary price-tabular">{formatPYG(total)}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:shadow-glow transition-all disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
            Confirmar por WhatsApp
          </button>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Sin pagos online. Te abrimos WhatsApp con el resumen prellenado.
          </p>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
