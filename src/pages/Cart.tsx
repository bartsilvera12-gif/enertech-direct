import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/store/cart";
import { formatPYG } from "@/services/storeService";

const Cart = () => {
  const { items, setQuantity, remove, subtotal, clear } = useCart();
  const total = subtotal();

  if (items.length === 0) {
    return (
      <div className="container py-24 text-center max-w-md">
        <div className="size-20 rounded-full bg-surface hairline mx-auto flex items-center justify-center mb-6">
          <ShoppingBag className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Tu carrito está vacío</h1>
        <p className="mt-3 text-muted-foreground">Explorá los sistemas Enertech y empezá tu pedido.</p>
        <Link to="/catalog" className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:shadow-glow transition-all">
          Ver catálogo <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-10">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Carrito</span>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-2">Tu pedido</h1>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 rounded-3xl bg-surface hairline divide-y divide-white/5 overflow-hidden">
          {items.map((item) => (
            <div key={item.productId} className="p-5 flex gap-5">
              <Link to={`/product/${item.slug}`} className="size-24 rounded-xl bg-background overflow-hidden hairline shrink-0">
                {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
              </Link>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between gap-2">
                  <Link to={`/product/${item.slug}`} className="font-medium leading-tight hover:text-primary truncate">
                    {item.name}
                  </Link>
                  <button onClick={() => remove(item.productId)} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Quitar">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground price-tabular mt-1">
                  {formatPYG(item.price)} c/u
                </span>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div className="inline-flex items-center hairline rounded-full">
                    <button onClick={() => setQuantity(item.productId, item.quantity - 1)} className="p-2 hover:text-primary" aria-label="Restar">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="px-4 text-sm price-tabular">{item.quantity}</span>
                    <button onClick={() => setQuantity(item.productId, item.quantity + 1)} className="p-2 hover:text-primary disabled:opacity-30" disabled={item.quantity >= item.stock} aria-label="Sumar">
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="font-semibold text-primary price-tabular">
                    {formatPYG(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl bg-surface hairline p-6 lg:sticky lg:top-24 space-y-5">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Productos</span>
              <span className="price-tabular">{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="price-tabular">{formatPYG(total)}</span>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4 flex justify-between items-baseline">
            <span className="text-sm uppercase tracking-widest">Total</span>
            <span className="text-2xl font-semibold text-primary price-tabular">{formatPYG(total)}</span>
          </div>
          <Link to="/checkout" className="block w-full text-center text-sm font-semibold tracking-wide px-6 py-3.5 rounded-full bg-primary text-primary-foreground hover:shadow-glow transition-all">
            Continuar al checkout
          </Link>
          <button onClick={clear} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
};

export default Cart;
