import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import {
  fetchProductBySlug,
  fetchRelatedProducts,
  formatProductWhatsAppHref,
  formatPYG,
} from "@/services/storeService";
import { recordProductEvent } from "@/services/productEventService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import { AddToCartButton } from "@/components/store/AddToCartButton";
import { useStoreWhatsappDigits } from "@/hooks/useStoreWhatsappHref";
import { cn } from "@/lib/utils";
const PLACEHOLDER_IMG =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880618/ed87b586-7ad8-442b-aac0-5826742a33b1.png";

const ProductDetail = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: waDigits } = useStoreWhatsappDigits();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });
  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.id],
    queryFn: () => (product ? fetchRelatedProducts(product) : Promise.resolve([])),
    enabled: !!product,
  });

  const whatsappHref = useMemo(
    () => (product && waDigits ? formatProductWhatsAppHref(product, waDigits) : undefined),
    [product, waDigits],
  );

  useEffect(() => {
    if (product) document.title = `${product.name} — Enertech`;
  }, [product]);

  useEffect(() => {
    if (!product?.id) return;
    void recordProductEvent(product.id, "view");
  }, [product?.id]);

  /**
   * Combina imagen principal + galería sin duplicar URLs.
   * Orden: imagen principal (image_url) primero, luego galería en orden, omitiendo la principal si ya está.
   * Dedupe por URL exacta.
   */
  const allImages = useMemo<string[]>(() => {
    if (!product) return [];
    const main = product.imageUrl?.trim() || null;
    const seen = new Set<string>();
    const list: string[] = [];
    const push = (url: string | null | undefined) => {
      const u = url?.trim();
      if (!u || seen.has(u)) return;
      seen.add(u);
      list.push(u);
    };
    push(main);
    for (const url of product.gallery) push(url);
    if (list.length === 0) push(PLACEHOLDER_IMG);
    return list;
  }, [product]);

  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  const goPrev = useCallback(
    () => setActiveIndex((i) => (allImages.length === 0 ? 0 : (i - 1 + allImages.length) % allImages.length)),
    [allImages.length],
  );
  const goNext = useCallback(
    () => setActiveIndex((i) => (allImages.length === 0 ? 0 : (i + 1) % allImages.length)),
    [allImages.length],
  );

  useEffect(() => {
    if (allImages.length <= 1) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allImages.length, goPrev, goNext]);

  if (isLoading) {
    return (
      <div className="container py-16 sm:py-24 text-muted-foreground text-center text-sm">Cargando…</div>
    );
  }
  if (!product) {
    return (
      <div className="container py-16 sm:py-24 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold">Producto no encontrado</h1>
        <Link to="/catalog" className="text-primary mt-4 inline-block text-sm font-medium hover:underline">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const activeImage = allImages[activeIndex] ?? allImages[0];
  const hasMultipleImages = allImages.length > 1;

  return (
    <div className="container py-6 sm:py-10 md:py-12 lg:py-16">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Volver
      </button>

      <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 xl:gap-16">
        <ProductGallery
          images={allImages}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          activeImage={activeImage}
          hasMultiple={hasMultipleImages}
          productName={product.name}
          onPrev={goPrev}
          onNext={goNext}
        />

        <div className="lg:sticky lg:top-28 lg:self-start space-y-5 sm:space-y-6">
          {product.brand && (
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-primary">{product.brand}</p>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-semibold tracking-tight text-balance leading-tight">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {product.price > 0 ? (
              <p className="text-xl sm:text-2xl font-bold text-foreground spec-num">{formatPYG(product.price)}</p>
            ) : (
              <p className="text-muted-foreground text-sm">Consultar precio</p>
            )}
            {product.discountPercent != null && (
              <span className="inline-flex items-center rounded-md bg-primary/14 text-primary px-2.5 py-1 text-sm font-bold tabular-nums">
                −{product.discountPercent}%
              </span>
            )}
            {product.discountPercent != null &&
              product.compareAtPrice != null &&
              product.compareAtPrice > product.price && (
                <p className="text-sm sm:text-base text-muted-foreground line-through spec-num">
                  {formatPYG(product.compareAtPrice)}
                </p>
              )}
          </div>

          <dl className="grid gap-1 text-sm">
            <SpecRow label="Código" value={product.code ?? null} mono />
            <SpecRow label="SKU" value={product.sku ?? null} mono />
            <SpecRow label="Categoría" value={product.category?.name ?? null} />
            <SpecRow label="Subcategoría" value={product.subcategory?.name ?? null} />
            <SpecRow label="Proveedor" value={product.supplier ?? null} />
            <SpecRow label="Depósito" value={product.warehouse ?? null} />
            <SpecRow label="Tipo de artículo" value={product.articleType ?? null} />
            <SpecRow label="Situación" value={product.situation ?? null} />
            <SpecRow label="Rango" value={product.rangeLabel ?? null} />
          </dl>

          {product.shortDescription && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{product.shortDescription}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <AddToCartButton product={product} variant="detail" className="sm:flex-1" />
            <a
              href={whatsappHref ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!whatsappHref) e.preventDefault();
              }}
              className="inline-flex w-full sm:flex-1 items-center justify-center gap-2.5 sm:gap-3 rounded-xl bg-[#25D366] text-white px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-semibold hover:bg-[#1ebe5a] transition-colors shadow-lg shadow-black/10"
            >
              <MessageCircle className="size-5 shrink-0 fill-current" />
              Consultar por WhatsApp
            </a>
          </div>

          {product.description && (
            <div className="pt-6 sm:pt-8 border-t border-border/60">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Descripción</h3>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {Object.keys(product.specs).length > 0 && (
            <div className="pt-4 sm:pt-6">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Detalle</h3>
              <dl className="rounded-xl bg-muted/40 border border-border divide-y divide-border overflow-hidden">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex flex-wrap justify-between gap-2 sm:gap-4 p-3 sm:p-4 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-right break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 sm:mt-20 lg:mt-24">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6 sm:mb-8">Relacionados</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {related.map((p) => (
              <ProductCardPremium key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/* ---------- Subcomponentes ---------- */

function SpecRow({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/60">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={cn("text-right break-words min-w-0", mono && "font-mono", label === "Código" && "font-medium")}>
        {value}
      </dd>
    </div>
  );
}

function ProductGallery({
  images,
  activeIndex,
  onChange,
  activeImage,
  hasMultiple,
  productName,
  onPrev,
  onNext,
}: {
  images: string[];
  activeIndex: number;
  onChange: (i: number) => void;
  activeImage: string;
  hasMultiple: boolean;
  productName: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-3 sm:space-y-4 lg:sticky lg:top-28 lg:self-start">
      <div className="relative group aspect-square rounded-xl sm:rounded-2xl bg-muted/40 border border-border overflow-hidden">
        <img
          src={activeImage}
          alt={`${productName} (imagen ${activeIndex + 1} de ${images.length})`}
          className="w-full h-full object-contain transition-opacity"
          loading="eager"
        />

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={onPrev}
              aria-label="Imagen anterior"
              className={cn(
                "absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 size-9 sm:size-10 rounded-full",
                "bg-background/85 backdrop-blur-sm border border-border/60 shadow-soft",
                "grid place-items-center text-foreground/80 hover:text-foreground hover:bg-background",
                "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                "lg:opacity-0 lg:group-hover:opacity-100 max-lg:opacity-100",
              )}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Imagen siguiente"
              className={cn(
                "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 size-9 sm:size-10 rounded-full",
                "bg-background/85 backdrop-blur-sm border border-border/60 shadow-soft",
                "grid place-items-center text-foreground/80 hover:text-foreground hover:bg-background",
                "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                "lg:opacity-0 lg:group-hover:opacity-100 max-lg:opacity-100",
              )}
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 rounded-full bg-foreground/75 text-background text-[11px] font-semibold px-2.5 py-1 tabular-nums backdrop-blur-sm">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {hasMultiple && (
        <div
          className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:thin]"
          role="tablist"
          aria-label="Miniaturas del producto"
        >
          <div className="flex gap-2 sm:gap-2.5 pb-1 min-w-max sm:min-w-0 sm:grid sm:grid-cols-5 md:grid-cols-6">
            {images.map((img, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => onChange(i)}
                  role="tab"
                  aria-selected={active}
                  aria-label={`Mostrar imagen ${i + 1}`}
                  className={cn(
                    "shrink-0 snap-start size-16 sm:size-auto sm:w-full sm:aspect-square rounded-lg overflow-hidden",
                    "border bg-muted/30 transition-all duration-200",
                    active
                      ? "border-primary ring-2 ring-primary/30 shadow-soft"
                      : "border-border hover:border-primary/40 opacity-80 hover:opacity-100",
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;
