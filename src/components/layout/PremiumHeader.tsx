import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import logoOriginal from "@/assets/enertech-logo-original.png";

const navItems = [
  { to: "/catalog", label: "Catálogo" },
  { to: "/catalog?featured=1", label: "Destacados" },
  { to: "/#por-que", label: "Por qué Enertech" },
];

export const PremiumHeader = () => {
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-white/5">
      <div className="container flex items-center justify-between h-20">
        <Link to="/" className="flex items-center group" aria-label="Enertech — Inicio">
          <img
            src={logoOriginal}
            alt="Enertech — Energía e Insumos"
            className="h-12 md:h-14 w-auto rounded-xl"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "text-sm text-muted-foreground hover:text-foreground transition-colors",
                location.pathname + location.search === item.to && "text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={openCart}
            className="relative inline-flex items-center gap-2 rounded-full bg-surface hairline px-4 py-2 text-xs uppercase tracking-widest hover:bg-surface-elevated transition-colors"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Carrito</span>
            <span className="price-tabular text-primary">({count})</span>
          </button>
          <button
            className="md:hidden p-2 rounded-md hairline"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 animate-fade-in">
          <div className="container py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-muted-foreground hover:text-foreground py-1"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
