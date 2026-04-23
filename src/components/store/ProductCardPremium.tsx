import { Link } from "react-router-dom";
import { useMemo } from "react";
import { MessageCircle } from "lucide-react";
import type { Product } from "@/types";
import { formatProductWhatsAppHref, formatPYG } from "@/services/storeService";
import { recordProductEvent } from "@/services/productEventService";
import { useStoreWhatsappDigits } from "@/hooks/useStoreWhatsappHref";
import { cn } from "@/lib/utils";

const PLACEHOLDER_IMG =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880618/ed87b586-7ad8-442b-aac0-5826742a33b1.png";

interface Props {
  product: Product;
  className?: string;
}

export const ProductCardPremium = ({ product, className }: Props) => {
  const { data: waDigits } = useStoreWhatsappDigits();
  const whatsappHref = useMemo(
    () => (waDigits ? formatProductWhatsAppHref(product, waDigits) : undefined),
    [product, waDigits],
  );

  const img = product.mainImageUrl || PLACEHOLDER_IMG;
  const discount = product.discountPercent;

  const onProductLinkClick = () => {
    void recordProductEvent(product.id, "click");
  };

  return (
    <article
      className={cn(
        "group relative flex flex-col bg-card rounded-xl overflow-hidden border border-border/80 shadow-sm transition-all duration-300 hover:border-primary/35 hover:shadow-elevated hover:-translate-y-0.5",
        className,
      )}
    >
      <Link
        to={`/product/${product.slug}`}
        className="block relative aspect-square bg-muted/50 overflow-hidden"
        onClick={onProductLinkClick}
      >
        <img
          src={img}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {discount != null && (
          <div className="absolute top-3 right-3 z-[2] rounded-md bg-neutral-900/90 text-white px-2 py-1 text-[11px] font-bold tabular-nums shadow-sm">
            −{discount}%
          </div>
        )}
        {product.featured && (
          <div className="absolute top-3 left-3 z-[2] bg-primary text-primary-foreground px-2 py-1 rounded-md text-[10px] uppercase font-semibold tracking-wide">
            Destacado
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {product.brand && (
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{product.brand}</div>
        )}
        {!product.brand && product.category && (
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{product.category.name}</div>
        )}
        <Link to={`/product/${product.slug}`} className="block" onClick={onProductLinkClick}>
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 min-h-[40px] hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.code && <p className="text-xs text-muted-foreground font-mono">Código: {product.code}</p>}

        {product.price > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-lg font-bold text-foreground spec-num">{formatPYG(product.price)}</p>
            {discount != null && product.compareAtPrice != null && product.compareAtPrice > product.price && (
              <p className="text-sm text-muted-foreground line-through spec-num">{formatPYG(product.compareAtPrice)}</p>
            )}
          </div>
        )}
        {product.price === 0 && <p className="text-sm text-muted-foreground">Consultar precio</p>}

        <a
          href={whatsappHref ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!whatsappHref) e.preventDefault();
          }}
          className="mt-auto pt-3 inline-flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-lg text-sm font-semibold hover:bg-[#1ebe5a] transition-colors disabled:opacity-50"
          aria-disabled={!whatsappHref}
        >
          <MessageCircle className="size-4 shrink-0 fill-current" />
          Consultar por WhatsApp
        </a>
      </div>
    </article>
  );
};
