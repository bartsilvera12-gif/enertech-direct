import { Link } from "react-router-dom";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";
import { buildProductWhatsAppUrl, formatPYG } from "@/services/storeService";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  className?: string;
}

export const ProductCardPremium = ({ product, className }: Props) => {
  const add = useCart((s) => s.add);
  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock === 0;
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col bg-card rounded-2xl overflow-hidden border border-foreground/10 transition-all duration-300 hover:border-primary/40 hover:shadow-elevated hover:-translate-y-0.5",
        className
      )}
    >
      <Link to={`/product/${product.slug}`} className="block relative aspect-square bg-surface overflow-hidden">
        {product.mainImageUrl ? (
          <img
            src={product.mainImageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">
            [Sin imagen]
          </div>
        )}

        {/* Top-left: discount badge */}
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-md">
            −{discount}%
          </div>
        )}

        {/* Top-right: featured */}
        {product.featured && (
          <div className="absolute top-3 right-3 bg-foreground text-background px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold">
            Destacado
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {product.category && (
          <div className="text-[11px] uppercase tracking-wider text-foreground/55">
            {product.category.name}
          </div>
        )}
        <Link to={`/product/${product.slug}`} className="block">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 hover:text-primary transition-colors min-h-[40px]">
            {product.name}
          </h3>
        </Link>

        {/* Stock pill */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              outOfStock ? "bg-foreground/30" : lowStock ? "bg-primary animate-pulse" : "bg-emerald-500"
            )}
          />
          <span className="text-[11px] font-medium text-foreground/70">
            {outOfStock ? "Sin stock" : lowStock ? `Últimas ${product.stock}` : "En stock"}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          {product.compareAtPrice && (
            <span className="text-xs text-foreground/40 line-through spec-num">
              {formatPYG(product.compareAtPrice)}
            </span>
          )}
          <span className="text-lg font-bold text-foreground spec-num">
            {formatPYG(product.price)}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-3 grid grid-cols-[1fr_auto] gap-2">
          <a
            href={buildProductWhatsAppUrl(product)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 bg-[#25D366] text-white px-3 py-2.5 rounded-full text-xs font-semibold hover:bg-[#1ebe5a] transition-colors"
          >
            <MessageCircle className="size-3.5 fill-current" />
            WhatsApp
          </a>
          <button
            onClick={() => add(product)}
            disabled={outOfStock}
            className="inline-flex items-center justify-center size-10 rounded-full bg-foreground text-background hover:bg-primary transition-colors disabled:opacity-40"
            aria-label="Añadir al carrito"
          >
            <ShoppingBag className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
