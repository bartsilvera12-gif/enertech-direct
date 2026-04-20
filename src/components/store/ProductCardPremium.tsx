import { Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";
import { formatPYG } from "@/services/storeService";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  className?: string;
}

export const ProductCardPremium = ({ product, className }: Props) => {
  const add = useCart((s) => s.add);
  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock === 0;

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl bg-surface hairline overflow-hidden transition-all duration-300 hover:bg-surface-elevated hover:-translate-y-1 hover:shadow-elevated",
        className
      )}
    >
      <Link to={`/product/${product.slug}`} className="block aspect-[4/3] overflow-hidden bg-background">
        {product.mainImageUrl ? (
          <img
            src={product.mainImageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/20 text-xs">
            [Hardware]
          </div>
        )}
      </Link>

      <div className="absolute top-3 left-3 flex gap-2">
        {product.featured && (
          <span className="text-[10px] uppercase tracking-widest font-medium px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
            Destacado
          </span>
        )}
        {lowStock && (
          <span className="text-[10px] uppercase tracking-widest font-medium px-2 py-1 rounded-full bg-background/80 text-foreground border border-white/10">
            Últimas {product.stock}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        {product.category && (
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {product.category.name}
          </span>
        )}
        <Link to={`/product/${product.slug}`} className="text-base font-medium leading-tight hover:text-primary transition-colors">
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between gap-2 border-t border-white/5">
          <div className="flex flex-col">
            {product.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through price-tabular">
                {formatPYG(product.compareAtPrice)}
              </span>
            )}
            <span className="text-base font-semibold text-primary price-tabular">
              {formatPYG(product.price)}
            </span>
          </div>
          <button
            onClick={() => add(product)}
            disabled={outOfStock}
            className="text-xs uppercase tracking-widest font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {outOfStock ? "Agotado" : "Añadir"}
          </button>
        </div>
      </div>
    </article>
  );
};
