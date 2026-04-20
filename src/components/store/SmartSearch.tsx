import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowUpRight, Sparkles, Command } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories, formatPYG } from "@/services/storeService";
import { cn } from "@/lib/utils";

interface SmartSearchProps {
  variant?: "header" | "hero";
  placeholder?: string;
}

const QUICK_SUGGESTIONS = [
  "Panel solar 450W",
  "Batería litio",
  "Inversor híbrido",
  "Microinversor",
  "Kit montaje",
];

export const SmartSearch = ({
  variant = "header",
  placeholder = "Buscá paneles, baterías, inversores…",
}: SmartSearchProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProducts(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const q = query.trim().toLowerCase();
  const productMatches = useMemo(() => {
    if (!q) return products.slice(0, 4);
    return products
      .map((p) => {
        const hay = `${p.name} ${p.shortDescription ?? ""} ${p.sku ?? ""} ${p.category?.name ?? ""}`.toLowerCase();
        const score = hay.includes(q) ? (p.name.toLowerCase().startsWith(q) ? 3 : hay.startsWith(q) ? 2 : 1) : 0;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.p);
  }, [products, q]);

  const categoryMatches = useMemo(() => {
    if (!q) return categories.slice(0, 3);
    return categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3);
  }, [categories, q]);

  const flatItems = useMemo(
    () => [
      ...categoryMatches.map((c) => ({ type: "cat" as const, id: c.id, label: c.name, to: `/catalog?cat=${c.slug}` })),
      ...productMatches.map((p) => ({ type: "prod" as const, id: p.id, label: p.name, to: `/p/${p.slug}` })),
    ],
    [categoryMatches, productMatches]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const submit = () => {
    if (flatItems[activeIndex]) {
      navigate(flatItems[activeIndex].to);
      setOpen(false);
      setQuery("");
      return;
    }
    if (q) {
      navigate(`/catalog?q=${encodeURIComponent(q)}`);
      setOpen(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const isHero = variant === "hero";

  return (
    <div ref={wrapRef} className={cn("relative", isHero ? "w-full" : "w-full max-w-md")}>
      <div
        className={cn(
          "group flex items-center gap-3 rounded-full bg-surface-elevated transition-all",
          "border border-foreground/10 shadow-soft",
          "focus-within:border-foreground/30 focus-within:shadow-elevated",
          isHero ? "px-5 py-3.5" : "px-4 py-2.5"
        )}
      >
        <Search className={cn("text-muted-foreground transition-colors group-focus-within:text-foreground", isHero ? "size-5" : "size-4")} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70",
            isHero ? "text-base" : "text-sm"
          )}
          aria-label="Búsqueda inteligente"
        />
        {!isHero && (
          <kbd className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground border border-foreground/10 rounded px-1.5 py-0.5">
            <Command className="size-3" />K
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-2 z-50 rounded-2xl bg-surface-elevated border border-foreground/10 shadow-elevated overflow-hidden animate-fade-in">
          {/* AI hint */}
          <div className="flex items-center gap-2 px-4 py-2.5 text-[11px] uppercase tracking-widest text-muted-foreground border-b border-foreground/5 bg-surface">
            <Sparkles className="size-3 text-brand" />
            Búsqueda asistida
            {q && <span className="ml-auto normal-case tracking-normal text-foreground/70">{flatItems.length} resultados</span>}
          </div>

          {!q && (
            <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-foreground/5">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    inputRef.current?.focus();
                  }}
                  className="text-xs rounded-full bg-surface hairline px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {categoryMatches.length > 0 && (
            <div className="py-2">
              <div className="px-4 pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Categorías</div>
              {categoryMatches.map((c, i) => {
                const idx = i;
                return (
                  <Link
                    key={c.id}
                    to={`/catalog?cat=${c.slug}`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                      activeIndex === idx ? "bg-foreground text-background" : "hover:bg-surface"
                    )}
                  >
                    <span className="font-medium">{c.name}</span>
                    <ArrowUpRight className="size-4 opacity-60" />
                  </Link>
                );
              })}
            </div>
          )}

          {productMatches.length > 0 ? (
            <div className="py-2 border-t border-foreground/5">
              <div className="px-4 pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Productos</div>
              {productMatches.map((p, i) => {
                const idx = categoryMatches.length + i;
                return (
                  <Link
                    key={p.id}
                    to={`/p/${p.slug}`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 transition-colors",
                      activeIndex === idx ? "bg-foreground text-background" : "hover:bg-surface"
                    )}
                  >
                    <div className="size-10 rounded-lg overflow-hidden bg-surface flex-shrink-0">
                      {p.mainImageUrl && (
                        <img src={p.mainImageUrl} alt="" className="size-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className={cn("text-xs truncate", activeIndex === idx ? "text-background/70" : "text-muted-foreground")}>
                        {p.category?.name} · {p.sku}
                      </div>
                    </div>
                    <span className="price-tabular text-sm font-semibold whitespace-nowrap">{formatPYG(p.price)}</span>
                  </Link>
                );
              })}
            </div>
          ) : q ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin resultados para <span className="text-foreground font-medium">"{query}"</span>
            </div>
          ) : null}

          <div className="px-4 py-2.5 text-[11px] text-muted-foreground bg-surface border-t border-foreground/5 flex items-center justify-between">
            <span>↑ ↓ navegar · ↵ abrir · esc cerrar</span>
            {q && (
              <button onClick={submit} className="text-foreground hover:text-brand font-medium transition-colors">
                Ver todos los resultados →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
