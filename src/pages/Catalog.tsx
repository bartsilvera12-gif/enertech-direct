import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import { cn } from "@/lib/utils";

const Catalog = () => {
  const [params, setParams] = useSearchParams();
  const catSlug = params.get("cat") ?? undefined;
  const featuredOnly = params.get("featured") === "1";
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");

  useEffect(() => { document.title = "Catálogo — Enertech"; }, []);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", catSlug, featuredOnly, search, sort],
    queryFn: () => fetchProducts({ categorySlug: catSlug, featuredOnly, search, sort }),
  });

  const setCat = (slug?: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set("cat", slug); else next.delete("cat");
    setParams(next);
  };
  const toggleFeatured = () => {
    const next = new URLSearchParams(params);
    if (featuredOnly) next.delete("featured"); else next.set("featured", "1");
    setParams(next);
  };

  const activeCat = useMemo(() => categories.find((c) => c.slug === catSlug), [categories, catSlug]);

  return (
    <div className="container py-12 md:py-16">
      <header className="mb-10">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Catálogo</span>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mt-2">
          {activeCat ? activeCat.name : featuredOnly ? "Productos destacados" : "Todos los sistemas"}
        </h1>
      </header>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-surface hairline rounded-full pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="bg-surface hairline rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <button
          onClick={() => setCat(undefined)}
          className={cn(
            "text-xs uppercase tracking-widest px-4 py-2 rounded-full hairline transition-colors",
            !catSlug ? "bg-primary text-primary-foreground border-primary" : "bg-surface hover:bg-surface-elevated"
          )}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.slug)}
            className={cn(
              "text-xs uppercase tracking-widest px-4 py-2 rounded-full hairline transition-colors",
              catSlug === c.slug ? "bg-primary text-primary-foreground border-primary" : "bg-surface hover:bg-surface-elevated"
            )}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={toggleFeatured}
          className={cn(
            "text-xs uppercase tracking-widest px-4 py-2 rounded-full hairline transition-colors ml-auto",
            featuredOnly ? "bg-primary text-primary-foreground border-primary" : "bg-surface hover:bg-surface-elevated"
          )}
        >
          ★ Solo destacados
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">No encontramos productos con ese criterio.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <ProductCardPremium key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;
