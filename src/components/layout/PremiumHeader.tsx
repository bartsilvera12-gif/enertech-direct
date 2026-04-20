import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { SmartSearch } from "@/components/store/SmartSearch";
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "backdrop-blur-2xl bg-background/80 border-b border-foreground/10 shadow-soft"
          : "backdrop-blur-md bg-background/50 border-b border-transparent"
      )}
    >
      <div className="container flex items-center gap-6 h-20">
        <Link to="/" className="flex items-center group flex-shrink-0" aria-label="Enertech — Inicio">
          <img
            src={logoOriginal}
            alt="Enertech — Energía e Insumos"
            className="h-11 md:h-12 w-auto rounded-xl transition-transform group-hover:scale-[1.03]"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {navItems.map((item) => {
            const active = location.pathname + location.search === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative text-sm transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute -bottom-1 left-0 h-px bg-brand transition-all duration-300",
                    active ? "w-full" : "w-0 group-hover:w-full"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 hidden md:block max-w-md ml-auto">
          <SmartSearch />
        </div>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <button
            onClick={openCart}
            className="relative inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-brand transition-all duration-300 group"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Carrito</span>
            <span className="price-tabular">({count})</span>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-brand animate-pulse-glow" />
            )}
          </button>
          <button
            className="lg:hidden p-2 rounded-full hairline-strong hover:bg-surface transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="md:hidden container pb-3">
        <SmartSearch />
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-foreground/10 animate-fade-in bg-background/95 backdrop-blur-xl">
          <div className="container py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-foreground/80 hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-surface transition-colors"
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
