import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, MessageCircle, ChevronRight, Truck, Headphones, Phone, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { fetchCategories, rootCategories, childrenOfParentSlug } from "@/services/storeService";
import { SmartSearch } from "@/components/store/SmartSearch";

const HEADER_ISOTYPE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776878281/WhatsApp_Image_2026-04-20_at_12.37.03_PM_qvvqam.png";

const WA_BUSINESS = "https://wa.me/595971472716";
/** E.164 sin + para tel: en Paraguay */
const PHONE_E164 = "+595971472716";

const navItems = [
  { to: "/", label: "Inicio" },
  { to: "/catalog", label: "Productos" },
  { to: "/catalog", label: "Categorías", hash: "#cats" },
  { to: "/contact", label: "Contacto" },
];

export const PremiumHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  /** Raíz cuyas subcategorías están visibles en el mega menú / acordeón móvil */
  const [expandedRootSlug, setExpandedRootSlug] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const roots = rootCategories(categories);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!catOpen) setExpandedRootSlug(null);
  }, [catOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <div className="hidden md:block sticky top-0 z-[60] bg-muted/90 backdrop-blur-sm border-b border-border/50 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="container flex h-10 items-center justify-between gap-4 text-[13px] leading-tight text-muted-foreground">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 lg:gap-5">
            <span className="inline-flex min-w-0 items-center gap-2 text-foreground/88">
              <Truck className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate font-medium">Envíos Asunción e interior</span>
            </span>
            <span className="hidden text-border/70 lg:inline" aria-hidden>
              ·
            </span>
            <span className="hidden min-w-0 items-center gap-2 text-foreground/88 lg:inline-flex">
              <Headphones className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate font-medium">Soporte técnico comercial</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <a
              href={`tel:${PHONE_E164}`}
              className="inline-flex items-center gap-2 font-semibold tabular-nums text-foreground/90 transition-colors hover:text-primary"
            >
              <Phone className="size-3.5 shrink-0 opacity-75" aria-hidden />
              <span className="whitespace-nowrap">0971 472 716</span>
            </a>
            <span className="text-border/70" aria-hidden>
              |
            </span>
            <span className="inline-flex items-center gap-2 tabular-nums whitespace-nowrap">
              <Clock className="size-3.5 shrink-0 opacity-75" aria-hidden />
              L–V 8:00–18:00
            </span>
          </div>
        </div>
      </div>

      <header
        className={cn(
          "sticky top-0 md:top-10 z-40 bg-background/95 backdrop-blur-md transition-shadow",
          scrolled ? "shadow-soft border-b border-border/60" : "border-b border-border/40",
        )}
      >
        <div className="container flex items-center gap-4 md:gap-6 min-h-[4.25rem] py-2">
          <Link to="/" className="flex items-center flex-shrink-0 gap-2" aria-label="Enertech">
            <img
              src={HEADER_ISOTYPE_URL}
              alt="Enertech"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              width={56}
              height={56}
              decoding="async"
            />
          </Link>

          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-2xl">
            <div className="flex w-full rounded-xl overflow-hidden border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-primary/25">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar productos, marcas, códigos…"
                className="flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Buscar"
              />
              <button
                type="submit"
                className="bg-strategic text-strategic-foreground px-5 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:opacity-95 transition-opacity"
              >
                <Search className="size-4" />
                Buscar
              </button>
            </div>
          </form>

          <div className="flex items-center gap-2 ml-auto">
            <a
              href={WA_BUSINESS}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#1ebe5a] transition-colors"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
            <button
              className="lg:hidden size-10 inline-flex items-center justify-center rounded-lg border border-border/60 hover:bg-muted transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menú"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        <div className="hidden lg:block border-t border-border/40 bg-muted/30">
          <div className="container flex items-center gap-2 h-12">
            <div className="relative" onMouseLeave={() => setCatOpen(false)}>
              <button
                type="button"
                onMouseEnter={() => setCatOpen(true)}
                onClick={() => setCatOpen((v) => !v)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-deep transition-colors"
              >
                <Menu className="size-4" />
                Categorías
              </button>
              {catOpen && (
                <div className="absolute top-full left-0 mt-1 w-[min(100vw-2rem,380px)] max-h-[75vh] overflow-y-auto bg-popover border border-border rounded-xl shadow-elevated z-50 py-1 animate-fade-in">
                  {roots.map((c) => {
                    const kids = childrenOfParentSlug(categories, c.slug);
                    const expanded = expandedRootSlug === c.slug;
                    return (
                      <div key={c.id} className="border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-0 min-h-[44px]">
                          <Link
                            to={`/catalog?cat=${c.slug}`}
                            onClick={() => setCatOpen(false)}
                            className="flex-1 px-4 py-2.5 text-sm font-semibold hover:bg-muted text-left"
                          >
                            {c.name}
                          </Link>
                          {kids.length > 0 ? (
                            <button
                              type="button"
                              className="shrink-0 px-3 py-2.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                              aria-expanded={expanded}
                              aria-label={expanded ? "Ocultar subcategorías" : "Mostrar subcategorías"}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedRootSlug((prev) => (prev === c.slug ? null : c.slug));
                              }}
                            >
                              <ChevronRight
                                className={cn("size-4 transition-transform duration-200", expanded && "rotate-90")}
                              />
                            </button>
                          ) : (
                            <span className="w-10 shrink-0" aria-hidden />
                          )}
                        </div>
                        {kids.length > 0 && expanded && (
                          <div className="pb-2 bg-muted/20 border-t border-border/40">
                            {kids.map((k) => (
                              <Link
                                key={k.id}
                                to={`/catalog?cat=${c.slug}&sub=${k.slug}`}
                                onClick={() => {
                                  setCatOpen(false);
                                  setExpandedRootSlug(null);
                                }}
                                className="block pl-6 pr-4 py-2 text-sm text-foreground/90 hover:bg-muted hover:text-primary border-l-2 border-transparent hover:border-primary"
                              >
                                {k.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {navItems.map((item) => {
              const pathOnly = item.to.split("?")[0];
              const active =
                item.label === "Categorías"
                  ? false
                  : location.pathname === pathOnly && location.pathname !== "/" && item.to !== "/"
                    ? true
                    : location.pathname === "/" && item.to === "/";
              const isHomeActive = item.to === "/" && location.pathname === "/";
              return (
                <Link
                  key={item.label + item.to}
                  to={item.label === "Categorías" ? "/#categorias" : item.to}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active || isHomeActive ? "text-primary" : "text-foreground/75 hover:text-primary hover:bg-muted/80",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="md:hidden container py-3 border-t border-border/40 bg-muted/20">
          <SmartSearch />
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-border/40 bg-background animate-fade-in">
            <div className="container py-4 flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-2">Menú</div>
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.label === "Categorías" ? "/#categorias" : item.to}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm py-2.5 px-2 rounded-lg hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-2 mt-2">Categorías</div>
              {roots.map((c) => {
                const kids = childrenOfParentSlug(categories, c.slug);
                const expanded = expandedRootSlug === c.slug;
                return (
                  <div key={c.id} className="rounded-lg border border-border/50 overflow-hidden mb-1">
                    <div className="flex items-center">
                      <Link
                        to={`/catalog?cat=${c.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex-1 text-sm py-2.5 px-2 hover:bg-muted"
                      >
                        {c.name}
                      </Link>
                      {kids.length > 0 && (
                        <button
                          type="button"
                          className="px-2 py-2 text-muted-foreground"
                          aria-expanded={expanded}
                          onClick={() => setExpandedRootSlug((prev) => (prev === c.slug ? null : c.slug))}
                        >
                          <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
                        </button>
                      )}
                    </div>
                    {kids.length > 0 && expanded && (
                      <div className="bg-muted/30 border-t border-border/40 pl-3">
                        {kids.map((k) => (
                          <Link
                            key={k.id}
                            to={`/catalog?cat=${c.slug}&sub=${k.slug}`}
                            onClick={() => {
                              setMobileOpen(false);
                              setExpandedRootSlug(null);
                            }}
                            className="block text-sm py-2 text-muted-foreground hover:text-primary"
                          >
                            {k.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>
    </>
  );
};
