import { Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";
import { formatPYG } from "@/services/storeService";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  className?: string;
  index?: number;
}

export const ProductCardPremium = ({ product, className, index }: Props) => {
  const add = useCart((s) => s.add);
  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock === 0;

  return (
    <article className={cn("group flex flex-col", className)}>
      <Link to={`/product/${product.slug}`} className="block relative aspect-[4/5] bg-surface overflow-hidden mb-5">
        {product.mainImageUrl ? (
          <img
            src={product.mainImageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">
            [Sin imagen]
          </div>
        )}

        {/* Top labels */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
          {typeof index === "number" && (
            <span className="bg-background/95 backdrop-blur px-2 py-1 text-[10px] uppercase tracking-[0.2em] spec-num font-medium">
              {String(index + 1).padStart(3, "0")}
            </span>
          )}
          <div className="flex flex-col gap-1.5 ml-auto items-end">
            {product.featured && (
              <span className="bg-foreground text-background px-2 py-1 text-[10px] uppercase tracking-[0.2em] font-medium">
                Destacado
              </span>
            )}
            {lowStock && (
              <span className="bg-primary text-primary-foreground px-2 py-1 text-[10px] uppercase tracking-[0.2em] font-medium">
                Últimas {product.stock}
              </span>
            )}
          </div>
        </div>

        {/* Quick add */}
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!outOfStock) add(product);
          }}
          disabled={outOfStock}
          className="absolute bottom-0 left-0 right-0 bg-foreground text-background py-3.5 text-xs uppercase tracking-[0.2em] font-medium translate-y-full group-hover:translate-y-0 transition-transform duration-500 disabled:opacity-40 hover:bg-primary"
        >
          {outOfStock ? "Agotado" : "Añadir al carrito"}
        </button>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {product.category && (
            <div className="eyebrow mb-1.5">{product.category.name}</div>
          )}
          <Link to={`/product/${product.slug}`} className="font-serif text-xl font-normal tracking-tight leading-tight block hover:text-primary transition-colors">
            {product.name}
          </Link>
          {product.shortDescription && (
            <p className="text-sm text-foreground/55 leading-relaxed line-clamp-1 mt-1.5">
              {product.shortDescription}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="spec-num font-medium">{formatPYG(product.price)}</div>
          {product.compareAtPrice && (
            <div className="spec-num text-xs text-foreground/40 line-through">
              {formatPYG(product.compareAtPrice)}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
