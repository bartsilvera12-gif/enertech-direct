import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { formatPYG } from "@/services/storeService";

export const CartDrawer = () => {
  const { isOpen, close, items, setQuantity, remove, subtotal, clear } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;
  const total = subtotal();

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={close}
        aria-hidden
      />
      <aside className="w-full max-w-md bg-surface border-l border-white/5 flex flex-col animate-fade-up shadow-elevated">
        <header className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <h2 className="text-sm font-medium uppercase tracking-widest">Carrito</h2>
            <span className="text-xs text-muted-foreground price-tabular">
              ({items.length})
            </span>
          </div>
          <button onClick={close} className="p-1.5 rounded-md hover:bg-white/5" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="size-16 rounded-full bg-background flex items-center justify-center hairline">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium">Tu carrito está vacío</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Explorá nuestros sistemas premium y agregá los que necesitás.
            </p>
            <Link
              to="/catalog"
              onClick={close}
              className="mt-2 inline-flex text-xs uppercase tracking-widest font-medium px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {items.map((item) => (
                <div key={item.productId} className="p-5 flex gap-4">
                  <div className="size-20 rounded-xl bg-background overflow-hidden hairline shrink-0">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between gap-2">
                      <h4 className="text-sm font-medium leading-tight truncate">{item.name}</h4>
                      <button onClick={() => remove(item.productId)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Quitar">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground price-tabular mt-1">
                      {formatPYG(item.price)} c/u
                    </span>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="inline-flex items-center hairline rounded-full">
                        <button
                          onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          className="p-1.5 hover:text-primary"
                          aria-label="Restar"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="px-3 text-sm price-tabular">{item.quantity}</span>
                        <button
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

            <footer className="p-5 border-t border-white/5 space-y-4 bg-background/40">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Subtotal</span>
                <span className="text-xl font-semibold text-primary price-tabular">{formatPYG(total)}</span>
              </div>
              <Link
                to="/checkout"
                onClick={close}
                className="block w-full text-center text-sm font-semibold tracking-wide px-6 py-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Ir al checkout
              </Link>
              <button
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
