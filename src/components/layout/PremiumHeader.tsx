import { Link, useLocation } from "react-router-dom";
import { ShoppingBag, Menu, X, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { SmartSearch } from "@/components/store/SmartSearch";
import logoOriginal from "@/assets/enertech-logo-original.png";

const navItems = [
  { to: "/catalog", label: "Catálogo" },
  { to: "/catalog?featured=1", label: "Destacados" },
  { to: "/#por-que", label: "Tecnología" },
];

export const PremiumHeader = () => {
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top utility strip */}
      <div className="hidden md:block bg-foreground text-background">
        <div className="container flex items-center justify-between h-8 text-[11px] tracking-wide">
          <span className="opacity-70">Envíos a todo Paraguay · Asesoría técnica gratuita</span>
          <div className="flex items-center gap-6 opacity-80">
            <span>+595 981 000 000</span>
            <span className="opacity-50">|</span>
            <span>L–V 8:00–18:00</span>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300 bg-background",
          scrolled ? "border-b border-foreground/10" : "border-b border-foreground/5"
        )}
      >
        <div className="container flex items-center gap-10 h-20">
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="Enertech">
            <img
              src={logoOriginal}
              alt="Enertech"
              className="h-10 w-auto rounded-lg"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-9 ml-2">
            {navItems.map((item) => {
              const active = location.pathname + location.search === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative text-[13px] font-medium transition-colors py-2",
                    active ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                  )}
                >
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-px left-0 right-0 h-px bg-foreground" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="size-10 inline-flex items-center justify-center rounded-full hover:bg-surface transition-colors"
              aria-label="Buscar"
            >
              <Search className="size-[18px]" />
            </button>

            <button
              onClick={openCart}
              className="relative size-10 inline-flex items-center justify-center rounded-full hover:bg-surface transition-colors"
              aria-label="Carrito"
            >
              <ShoppingBag className="size-[18px]" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center spec-num">
                  {count}
                </span>
              )}
            </button>

            <button
              className="lg:hidden size-10 inline-flex items-center justify-center rounded-full hover:bg-surface transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menú"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Search panel */}
        {searchOpen && (
          <div className="border-t border-foreground/10 bg-background animate-fade-in">
            <div className="container py-5">
              <SmartSearch />
            </div>
          </div>
        )}

        {mobileOpen && (
          <div className="lg:hidden border-t border-foreground/10 animate-fade-in bg-background">
            <div className="container py-5 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-foreground/80 hover:text-foreground py-3 border-b border-foreground/5"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
};
