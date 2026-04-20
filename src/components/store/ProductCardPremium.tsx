import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
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
        "group relative flex flex-col rounded-3xl bg-surface-elevated border border-foreground/10 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-elevated hover:border-foreground/20",
        className
      )}
    >
      <Link to={`/product/${product.slug}`} className="block aspect-[4/3] overflow-hidden bg-surface relative">
        {product.mainImageUrl ? (
          <img
            src={product.mainImageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/20 text-xs">
            [Hardware]
          </div>
        )}
        {/* Subtle dark vignette on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Quick add overlay */}
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!outOfStock) add(product);
          }}
          disabled={outOfStock}
          className="absolute bottom-4 right-4 size-11 rounded-full bg-background text-foreground flex items-center justify-center shadow-elevated translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 hover:bg-brand hover:text-brand-foreground disabled:opacity-40"
          aria-label="Añadir al carrito"
        >
          <ShoppingBag className="size-4" />
        </button>
      </Link>

      <div className="absolute top-3 left-3 flex gap-2">
        {product.featured && (
          <span className="text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-foreground text-background">
            Destacado
          </span>
        )}
        {lowStock && (
          <span className="text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-brand text-brand-foreground">
            Últimas {product.stock}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-2 flex-1">
        {product.category && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {product.category.name}
          </span>
        )}
        <Link to={`/product/${product.slug}`} className="text-base font-semibold leading-tight tracking-tight hover:text-brand transition-colors">
          {product.name}
        </Link>
        {product.shortDescription && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-end justify-between gap-2 border-t border-foreground/10">
          <div className="flex flex-col">
            {product.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through price-tabular">
                {formatPYG(product.compareAtPrice)}
              </span>
            )}
            <span className="text-base font-semibold price-tabular tracking-tight">
              {formatPYG(product.price)}
            </span>
          </div>
          <button
            onClick={() => add(product)}
            disabled={outOfStock}
            className="text-xs uppercase tracking-widest font-semibold px-4 py-2.5 rounded-full bg-foreground text-background hover:bg-brand transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {outOfStock ? "Agotado" : "Añadir"}
          </button>
        </div>
      </div>
    </article>
  );
};
