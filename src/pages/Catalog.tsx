import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import {
  fetchCategories,
  fetchProducts,
  fetchCatalogFacets,
  rootCategories,
  childrenOfParentSlug,
  type CatalogSort,
} from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import { Button } from "@/components/ui/button";

const Catalog = () => {
  const [params, setParams] = useSearchParams();

  const catSlug = params.get("cat") ?? undefined;
  const subSlug = params.get("sub") ?? undefined;
  const featuredOnly = params.get("featured") === "1" || params.get("featured") === "true";
  const brand = params.get("brand") ?? undefined;
  const supplier = params.get("supplier") ?? undefined;
  const warehouse = params.get("warehouse") ?? undefined;
  const situation = params.get("situation") ?? undefined;
  const articleType = params.get("tipo") ?? undefined;
  const rangeLabel = params.get("rango") ?? undefined;

  const [search, setSearch] = useState(params.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<CatalogSort>((params.get("sort") as CatalogSort) || "newest");

  useEffect(() => {
    document.title = "Catálogo — Enertech";
  }, []);

  useEffect(() => {
    setSearch(params.get("q") ?? "");
    setDebouncedSearch(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data: categories = [],
    isError: categoriesQueryError,
    error: categoriesErrDetail,
  } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const roots = rootCategories(categories);

  const subOptions = useMemo(() => {
    if (!catSlug) return [];
    return childrenOfParentSlug(categories, catSlug);
  }, [categories, catSlug]);

  const { data: facets } = useQuery({
    queryKey: ["catalog-facets"],
    queryFn: fetchCatalogFacets,
  });

  const {
    data: products = [],
    isLoading,
    isError: productsQueryError,
    error: productsErrDetail,
  } = useQuery({
    queryKey: [
      "products",
      "catalog",
      catSlug,
      subSlug,
      brand,
      supplier,
      warehouse,
      situation,
      articleType,
      rangeLabel,
      debouncedSearch,
      sort,
      featuredOnly,
    ],
    queryFn: () =>
      fetchProducts({
        categorySlug: catSlug,
        subcategorySlug: subSlug,
        brand,
        supplier,
        warehouse,
        situation,
        articleType,
        rangeLabel,
        search: debouncedSearch,
        sort,
        featuredOnly,
      }),
  });

  const catalogError = categoriesQueryError || productsQueryError;
  const catalogErrorMsg =
    (categoriesErrDetail instanceof Error ? categoriesErrDetail.message : String(categoriesErrDetail ?? "")) ||
    (productsErrDetail instanceof Error ? productsErrDetail.message : String(productsErrDetail ?? ""));

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const clearFilters = () => {
    setParams(new URLSearchParams());
    setSearch("");
    setSort("newest");
  };

  return (
    <div className="container py-10 md:py-14">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Catálogo corporativo</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Productos</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          Filtrá por categoría, marca, depósito y más. Consultá disponibilidad por WhatsApp en cada ficha.
        </p>
      </header>

      {catalogError ? (
        <div
          role="alert"
          className="mb-8 rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-semibold">Error al cargar datos del catálogo</p>
          <p className="mt-1 break-words opacity-90">{catalogErrorMsg || "Revisá consola y políticas RLS en Supabase."}</p>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar filtros */}
        <aside className="lg:w-72 shrink-0 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Filter className="size-4 text-primary" />
              Filtros
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoría</label>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  value={catSlug ?? ""}
                  onChange={(e) => {
                    const v = e.target.value || undefined;
                    const next = new URLSearchParams(params);
                    if (v) next.set("cat", v);
                    else next.delete("cat");
                    next.delete("sub");
                    setParams(next);
                  }}
                >
                  <option value="">Todas</option>
                  {roots.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subcategoría</label>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  value={subSlug ?? ""}
                  disabled={!catSlug || subOptions.length === 0}
                  onChange={(e) => setParam("sub", e.target.value || undefined)}
                >
                  <option value="">—</option>
                  {subOptions.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <FacetSelect label="Marca" value={brand} options={facets?.brands ?? []} onChange={(v) => setParam("brand", v)} />
              <FacetSelect label="Proveedor" value={supplier} options={facets?.suppliers ?? []} onChange={(v) => setParam("supplier", v)} />
              <FacetSelect label="Depósito" value={warehouse} options={facets?.warehouses ?? []} onChange={(v) => setParam("warehouse", v)} />
              <FacetSelect label="Tipo de artículo" value={articleType} options={facets?.articleTypes ?? []} onChange={(v) => setParam("tipo", v)} />
              <FacetSelect label="Situación" value={situation} options={facets?.situations ?? []} onChange={(v) => setParam("situation", v)} />
              <FacetSelect label="Rango" value={rangeLabel} options={facets?.rangeLabels ?? []} onChange={(v) => setParam("rango", v)} />

              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => clearFilters()}>
                Limpiar filtros
              </Button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setParam("q", search.trim() || undefined);
                }}
                onBlur={() => setParam("q", search.trim() || undefined)}
                placeholder="Buscar por nombre, código o marca…"
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="size-4 text-muted-foreground hidden sm:block" />
              <select
                value={sort}
                onChange={(e) => {
                  const v = e.target.value as CatalogSort;
                  setSort(v);
                  setParam("sort", v === "newest" ? undefined : v);
                }}
                className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
              >
                <option value="newest">Más recientes</option>
                <option value="name_asc">Por descripción (A-Z)</option>
                <option value="code_asc">Por código</option>
                <option value="price_asc">Precio: menor</option>
                <option value="price_desc">Precio: mayor</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-24 text-center text-muted-foreground">
              No hay productos con estos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCardPremium key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Catalog;
