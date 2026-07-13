import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Loader2, ShieldCheck } from "lucide-react";
import { useCart } from "@/store/cart";
import { createWhatsAppOrder, formatPYG } from "@/services/storeService";
import type { CheckoutCustomer, OrderConfirmation } from "@/types";
import { toast } from "sonner";

const fields: { key: keyof CheckoutCustomer; label: string; required: boolean; type?: string; textarea?: boolean; placeholder?: string }[] = [
  { key: "fullName", label: "Nombre completo", required: true, placeholder: "Juan Pérez" },
  { key: "phone", label: "Teléfono", required: true, type: "tel", placeholder: "0991 000 000" },
  { key: "document", label: "Documento (CI / RUC)", required: true, placeholder: "1234567 o 80012345-6" },
  { key: "email", label: "Email (opcional)", required: false, type: "email", placeholder: "juan@correo.com" },
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
    fullName: "", phone: "", document: "", email: "", city: "", address: "", reference: "", observations: "",
  });

  const total = subtotal();
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

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

        <aside className="rounded-3xl bg-surface hairline p-6 lg:sticky lg:top-24 space-y-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Resumen del pedido</h2>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground shrink-0">
              {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
            </span>
          </div>

          <ul className="space-y-3 max-h-80 overflow-y-auto -mr-2 pr-2">
            {items.map((it) => (
              <li key={it.productId} className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-muted/50 border border-border/60 overflow-hidden shrink-0">
                  {it.imageUrl && (
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-contain" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug line-clamp-2">{it.name}</p>
                  <p className="text-xs text-muted-foreground price-tabular mt-0.5">
                    {formatPYG(it.price)} <span className="opacity-60">×</span> {it.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold price-tabular shrink-0">
                  {formatPYG(it.price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between text-sm text-muted-foreground border-t border-border pt-4">
            <span>Subtotal</span>
            <span className="price-tabular">{formatPYG(total)}</span>
          </div>

          <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3.5 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide">Total</span>
            <span className="text-2xl font-bold text-primary price-tabular">{formatPYG(total)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-7 py-4 text-sm font-semibold rounded-2xl hover:shadow-glow hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
            Confirmar por WhatsApp
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center leading-relaxed">
            <ShieldCheck className="size-3.5 shrink-0 text-primary/70" />
            Sin pagos online · coordinás pago y entrega por WhatsApp
          </div>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
