import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { formatPYG } from "@/services/storeService";

export const CartDrawer = () => {
  const { isOpen, close, items, setQuantity, remove, subtotal, clear } = useCart();
  const total = subtotal();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    // z-[70] para quedar por encima del header sticky de PremiumHeader
    // (utility bar z-[60], nav z-40). Antes era z-50 y la barra superior
    // se encimaba sobre los items del carrito.
    <div className="fixed inset-0 z-[70] flex">
      <div className="flex-1 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={close} aria-hidden />
      <aside className="w-full max-w-md bg-surface border-l border-border/60 flex flex-col animate-fade-up shadow-elevated">
        <header className="flex items-center justify-between p-5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-medium uppercase tracking-widest">Carrito</h2>
            <span className="text-xs text-muted-foreground price-tabular">({items.length})</span>
          </div>
          <button type="button" onClick={close} className="p-1.5 rounded-md hover:bg-muted" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="size-16 rounded-full bg-muted/80 flex items-center justify-center border border-border/60">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium">Tu carrito está vacío</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Explorá el catálogo y agregá los productos que necesitás.
            </p>
            <Link
              to="/catalog"
              onClick={close}
              className="mt-2 inline-flex text-xs uppercase tracking-widest font-medium px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary-deep transition-colors"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {items.map((item) => (
                <div key={item.productId} className="p-5 flex gap-4">
                  <div className="size-20 rounded-xl bg-muted/50 overflow-hidden border border-border/50 shrink-0">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between gap-2">
                      <h4 className="text-sm font-medium leading-tight truncate">{item.name}</h4>
                      <button
                        type="button"
                        onClick={() => remove(item.productId)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Quitar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      SKU: {item.sku?.trim() || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground price-tabular mt-1">
                      {formatPYG(item.price)} c/u
                    </span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-full border border-border/70 bg-background/80">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          className="p-1.5 hover:text-primary"
                          aria-label="Restar"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="px-3 text-sm price-tabular">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          className="p-1.5 hover:text-primary disabled:opacity-30"
                          disabled={item.quantity >= item.stock}
                          aria-label="Sumar"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-primary price-tabular">
                        {formatPYG(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="p-5 border-t border-border/60 space-y-4 bg-muted/20">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Total estimado</span>
                <span className="text-xl font-semibold text-primary price-tabular">{formatPYG(total)}</span>
              </div>
              {/* "Finalizar compra" lleva a /cart, donde el usuario revisa el
                  resumen y dispara WhatsApp con el botón único de esa página. */}
              <Link
                to="/cart"
                onClick={close}
                className="flex w-full items-center justify-center gap-2 text-center text-sm font-semibold tracking-wide px-6 py-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-deep transition-colors"
              >
                Finalizar compra
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={clear}
                className="block w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
