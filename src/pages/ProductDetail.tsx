import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, ShieldCheck, Truck, Zap } from "lucide-react";
import { fetchProductBySlug, fetchRelatedProducts, formatPYG } from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import { useCart } from "@/store/cart";

const ProductDetail = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });
  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.id],
    queryFn: () => (product ? fetchRelatedProducts(product) : Promise.resolve([])),
    enabled: !!product,
  });

  useEffect(() => {
    if (product) document.title = `${product.name} — Enertech`;
  }, [product]);

  if (isLoading) {
    return <div className="container py-24 text-muted-foreground text-center">Cargando...</div>;
  }
  if (!product) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-semibold">Producto no encontrado</h1>
        <Link to="/catalog" className="text-primary mt-4 inline-block">Volver al catálogo</Link>
      </div>
    );
  }

  const gallery = product.gallery.length > 0 ? product.gallery : [product.mainImageUrl ?? ""];
  const outOfStock = product.stock === 0;

  return (
    <div className="container py-12 md:py-16">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="size-3.5" /> Volver
      </button>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl bg-surface hairline overflow-hidden">
            <img
              src={gallery[activeImg]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-xl overflow-hidden hairline ${i === activeImg ? "ring-2 ring-primary" : "hover:opacity-80"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {product.category && (
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {product.category.name}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2 text-balance">
            {product.name}
          </h1>
          {product.shortDescription && (
            <p className="mt-4 text-muted-foreground leading-relaxed">{product.shortDescription}</p>
          )}

          <div className="mt-8 flex items-baseline gap-4">
            <span className="text-3xl font-semibold text-primary price-tabular">{formatPYG(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through price-tabular">
                {formatPYG(product.compareAtPrice)}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <span className={`size-2 rounded-full ${outOfStock ? "bg-destructive" : "bg-primary animate-pulse-glow"}`} />
            <span className="text-xs text-muted-foreground">
              {outOfStock ? "Agotado" : `${product.stock} unidades disponibles`}
            </span>
          </div>

          {/* Quantity + add */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center hairline-strong rounded-full">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-3 hover:text-primary" aria-label="Restar">
                <Minus className="size-4" />
              </button>
              <span className="px-4 price-tabular font-medium">{quantity}</span>
              <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))} className="p-3 hover:text-primary" aria-label="Sumar">
                <Plus className="size-4" />
              </button>
            </div>
            <button
              onClick={() => add(product, quantity)}
              disabled={outOfStock}
              className="flex-1 min-w-[200px] bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:shadow-glow transition-all disabled:opacity-40"
            >
              {outOfStock ? "Sin stock" : "Añadir al carrito"}
            </button>
          </div>

          {/* Trust */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
            {[
              { icon: ShieldCheck, label: "Garantía oficial" },
              { icon: Truck, label: "Envío nacional" },
              { icon: Zap, label: "Soporte experto" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl bg-surface hairline p-3 flex flex-col items-center text-center gap-2">
                <Icon className="size-4 text-primary" />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-10">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Descripción</h3>
              <p className="text-sm leading-relaxed text-foreground/90">{product.description}</p>
            </div>
          )}

          {/* Specs */}
          {Object.keys(product.specs).length > 0 && (
            <div className="mt-10">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Especificaciones</h3>
              <dl className="rounded-2xl bg-surface hairline divide-y divide-white/5 overflow-hidden">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between p-4 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium price-tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="text-2xl font-semibold tracking-tight mb-8">Productos relacionados</h2>
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
