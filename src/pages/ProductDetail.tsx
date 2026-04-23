import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle } from "lucide-react";
import {
  fetchProductBySlug,
  fetchRelatedProducts,
  formatProductWhatsAppHref,
  formatPYG,
} from "@/services/storeService";
import { recordProductEvent } from "@/services/productEventService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import { useStoreWhatsappDigits } from "@/hooks/useStoreWhatsappHref";
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

  if (isLoading) {
    return <div className="container py-24 text-muted-foreground text-center">Cargando…</div>;
  }
  if (!product) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-semibold">Producto no encontrado</h1>
        <Link to="/catalog" className="text-primary mt-4 inline-block">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const gallery =
    product.gallery.length > 0 ? product.gallery : product.mainImageUrl ? [product.mainImageUrl] : [PLACEHOLDER_IMG];

  return (
    <div className="container py-12 md:py-16">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="size-3.5" /> Volver
      </button>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl bg-muted/40 border border-border overflow-hidden">
            <img src={gallery[0]} alt={product.name} className="w-full h-full object-contain" />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {gallery.slice(0, 5).map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start space-y-6">
          {product.brand && (
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{product.brand}</p>
          )}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">{product.name}</h1>

          <div className="flex flex-wrap items-center gap-3">
            {product.price > 0 ? (
              <p className="text-2xl font-bold text-foreground spec-num">{formatPYG(product.price)}</p>
            ) : (
              <p className="text-muted-foreground">Consultar precio</p>
            )}
            {product.discountPercent != null && (
              <span className="inline-flex items-center rounded-md bg-destructive/12 text-destructive px-2.5 py-1 text-sm font-bold tabular-nums">
                −{product.discountPercent}%
              </span>
            )}
            {product.discountPercent != null &&
              product.compareAtPrice != null &&
              product.compareAtPrice > product.price && (
                <p className="text-base text-muted-foreground line-through spec-num">{formatPYG(product.compareAtPrice)}</p>
              )}
          </div>

          <dl className="grid gap-3 text-sm">
            {product.code && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-mono font-medium">{product.code}</dd>
              </div>
            )}
            {product.sku && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">SKU</dt>
                <dd className="font-mono">{product.sku}</dd>
              </div>
            )}
            {product.category && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Categoría</dt>
                <dd>{product.category.name}</dd>
              </div>
            )}
            {product.subcategory && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Subcategoría</dt>
                <dd>{product.subcategory.name}</dd>
              </div>
            )}
            {product.supplier && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Proveedor</dt>
                <dd>{product.supplier}</dd>
              </div>
            )}
            {product.warehouse && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Depósito</dt>
                <dd>{product.warehouse}</dd>
              </div>
            )}
            {product.articleType && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Tipo de artículo</dt>
                <dd>{product.articleType}</dd>
              </div>
            )}
            {product.situation && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Situación</dt>
                <dd>{product.situation}</dd>
              </div>
            )}
            {product.rangeLabel && (
              <div className="flex justify-between gap-4 py-2 border-b border-border/60">
                <dt className="text-muted-foreground">Rango</dt>
                <dd>{product.rangeLabel}</dd>
              </div>
            )}
          </dl>

          {product.shortDescription && <p className="text-muted-foreground leading-relaxed">{product.shortDescription}</p>}

          <a
            href={whatsappHref ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!whatsappHref) e.preventDefault();
            }}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-[#25D366] text-white px-8 py-4 text-base font-semibold hover:bg-[#1ebe5a] transition-colors shadow-lg shadow-black/10"
          >
            <MessageCircle className="size-5 shrink-0 fill-current" />
            Consultar por WhatsApp
          </a>

          {product.description && (
            <div className="pt-8 border-t border-border/60">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Descripción</h3>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {Object.keys(product.specs).length > 0 && (
            <div className="pt-6">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Detalle</h3>
              <dl className="rounded-xl bg-muted/40 border border-border divide-y divide-border overflow-hidden">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 p-4 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="text-2xl font-semibold tracking-tight mb-8">Relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCardPremium key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
