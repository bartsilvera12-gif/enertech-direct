import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Heart, User, ChevronDown, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";
import { fetchCategories } from "@/services/storeService";
import { SmartSearch } from "@/components/store/SmartSearch";
import logoOriginal from "@/assets/enertech-logo-original.png";

const navItems = [
  { to: "/", label: "Inicio" },
  { to: "/catalog", label: "Catálogo" },
  { to: "/#por-que", label: "Sobre Enertech" },
  { to: "/#proceso", label: "Cómo trabajamos" },
];

export const PremiumHeader = () => {
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      {/* Utility bar */}
      <div className="hidden md:block bg-foreground text-background">
        <div className="container flex items-center justify-between h-9 text-[12px]">
          <span className="opacity-80">Envíos a todo Paraguay · Asesoría técnica gratuita</span>
          <div className="flex items-center gap-5 opacity-90">
            <a href="https://wa.me/595981000000" className="hover:text-primary-glow transition-colors">+595 981 000 000</a>
            <span className="opacity-50">|</span>
            <span>L–V 8:00–18:00</span>
          </div>
        </div>
      </div>

      {/* Main header — logo + central search + actions */}
      <header
        className={cn(
          "sticky top-0 z-40 bg-background transition-shadow",
          scrolled ? "shadow-soft border-b border-foreground/5" : "border-b border-foreground/10"
        )}
      >
        <div className="container flex items-center gap-6 h-20">
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="Enertech">
            <img src={logoOriginal} alt="Enertech" className="h-11 w-auto rounded-lg" />
          </Link>

          {/* Central search — Tradexpar style */}
          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto">
            <div className="flex w-full rounded-full overflow-hidden border border-foreground/15 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-background">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Estoy buscando…"
                className="flex-1 bg-transparent px-5 py-3 text-sm outline-none placeholder:text-foreground/45"
                aria-label="Buscar productos"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary-deep transition-colors"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            <button className="hidden md:inline-flex size-10 items-center justify-center rounded-full hover:bg-surface transition-colors" aria-label="Cuenta">
              <User className="size-[18px]" />
            </button>
            <button className="hidden md:inline-flex relative size-10 items-center justify-center rounded-full hover:bg-surface transition-colors" aria-label="Favoritos">
              <Heart className="size-[18px]" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center spec-num">0</span>
            </button>
            <button
              onClick={openCart}
              className="relative size-10 inline-flex items-center justify-center rounded-full hover:bg-surface transition-colors"
              aria-label="Carrito"
            >
              <ShoppingBag className="size-[18px]" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center spec-num">
                {count}
              </span>
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

        {/* Nav strip */}
        <div className="hidden lg:block border-t border-foreground/10">
          <div className="container flex items-center gap-8 h-12">
            {/* Categories dropdown */}
            <div className="relative" onMouseLeave={() => setCatOpen(false)}>
              <button
                onMouseEnter={() => setCatOpen(true)}
                onClick={() => setCatOpen((v) => !v)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary-deep transition-colors"
              >
                <Menu className="size-4" />
                Categorías
                <ChevronDown className={cn("size-3.5 transition-transform", catOpen && "rotate-180")} />
              </button>
              {catOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-background border border-foreground/10 rounded-2xl shadow-elevated overflow-hidden z-50 animate-fade-in">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      to={`/catalog?cat=${c.slug}`}
                      onClick={() => setCatOpen(false)}
                      className="block px-5 py-3 text-sm font-medium hover:bg-surface hover:text-primary border-b border-foreground/5 last:border-0 transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navItems.map((item) => {
              const active = location.pathname + location.search === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    active ? "text-primary" : "text-foreground/75 hover:text-primary"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden container py-3 border-t border-foreground/10">
          <SmartSearch />
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-foreground/10 animate-fade-in bg-background">
            <div className="container py-4 flex flex-col">
              <div className="text-[11px] uppercase tracking-wider text-foreground/50 py-2">Categorías</div>
              {categories.map((c) => (
                <Link key={c.id} to={`/catalog?cat=${c.slug}`} onClick={() => setMobileOpen(false)} className="text-sm py-2.5 border-b border-foreground/5">
                  {c.name}
                </Link>
              ))}
              <div className="text-[11px] uppercase tracking-wider text-foreground/50 py-2 mt-3">Navegación</div>
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="text-sm py-2.5 border-b border-foreground/5">
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
