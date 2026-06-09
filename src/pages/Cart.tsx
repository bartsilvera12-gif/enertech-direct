import { Link } from "react-router-dom";
import { useMemo } from "react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, MessageCircle } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPYG } from "@/services/storeService";
import { recordProductEvent } from "@/services/productEventService";
import { buildCartWhatsAppUrl, DEFAULT_STORE_WHATSAPP_DIGITS } from "@/lib/cartWhatsApp";
import { useStoreWhatsappDigits } from "@/hooks/useStoreWhatsappHref";

/**
 * Página /cart — vista de "Carrito de compras" estilo checkout, con resumen
 * a la derecha y un único CTA "Comprar por WhatsApp" (no hay pasarela interna).
 * Es el destino del botón "Finalizar compra" del CartDrawer.
 */
const Cart = () => {
  const { items, setQuantity, remove, subtotal, clear } = useCart();
  const total = subtotal();

  const { data: waDigitsSetting } = useStoreWhatsappDigits();
  const whatsappDigits = waDigitsSetting?.replace(/\D/g, "") || DEFAULT_STORE_WHATSAPP_DIGITS;
  const whatsappHref = useMemo(
    () => (items.length ? buildCartWhatsAppUrl(whatsappDigits, items, total) : "#"),
    [whatsappDigits, items, total],
  );

  if (items.length === 0) {
    return (
      <div className="container py-24 text-center max-w-md">
        <div className="size-20 rounded-full bg-muted hairline mx-auto flex items-center justify-center mb-6">
          <ShoppingBag className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Tu carrito está vacío</h1>
        <p className="mt-3 text-muted-foreground">
          Explorá los sistemas Enertech y empezá tu pedido.
        </p>
        <Link
          to="/catalog"
          className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:shadow-glow transition-all"
        >
          Ver catálogo <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Carrito de compras</h1>
      </header>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        {/* Lista de items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 sm:p-5 flex gap-4 sm:gap-5"
            >
              <Link
                to={`/product/${item.slug}`}
                className="size-20 sm:size-24 rounded-xl bg-muted/40 overflow-hidden border border-border/50 shrink-0"
                onClick={() => {
                  void recordProductEvent(item.productId, "click");
                }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </Link>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between gap-2">
                  <Link
                    to={`/product/${item.slug}`}
                    className="font-semibold leading-tight hover:text-primary truncate"
                    onClick={() => {
                      void recordProductEvent(item.productId, "click");
                    }}
                  >
                    {item.name}
                  </Link>
                </div>
                <span className="text-sm text-muted-foreground price-tabular mt-1">
                  {formatPYG(item.price)}
                </span>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <div className="inline-flex items-center rounded-full border border-border/70 bg-background">
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      className="p-2 hover:text-primary"
                      aria-label="Restar"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="px-4 text-sm price-tabular">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      className="p-2 hover:text-primary disabled:opacity-30"
                      disabled={item.quantity >= item.stock}
                      aria-label="Sumar"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-primary price-tabular text-base">
                      {formatPYG(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => remove(item.productId)}
                      className="text-muted-foreground hover:text-destructive shrink-0 p-1.5 rounded-md hover:bg-destructive/10"
                      aria-label={`Quitar ${item.name} del carrito`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen + CTA WhatsApp único */}
        <aside className="rounded-2xl bg-card border border-border/60 shadow-soft p-6 lg:sticky lg:top-24 space-y-5">
          <h2 className="text-xl font-semibold tracking-tight">Resumen</h2>

          <div className="flex justify-between items-baseline text-sm border-b border-border/60 pb-4">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="price-tabular">{formatPYG(total)}</span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-base font-semibold">Total</span>
            <span className="text-2xl font-bold text-foreground price-tabular">
              {formatPYG(total)}
            </span>
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 text-center text-sm font-semibold tracking-wide px-6 py-3.5 rounded-xl bg-[#25D366] text-white hover:bg-[#1ebe5a] transition-colors shadow-sm"
          >
            <MessageCircle className="size-5 shrink-0" aria-hidden />
            Comprar por WhatsApp
          </a>

          <button
            onClick={clear}
            className="block w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
