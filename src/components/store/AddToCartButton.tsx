import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

interface Props {
  product: Product;
  className?: string;
  /** Estilo compacto en tarjeta vs. botón destacado en ficha */
  variant?: "card" | "detail";
}

export function AddToCartButton({ product, className, variant = "card" }: Props) {
  const add = useCart((s) => s.add);

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      toast.error("Sin stock disponible");
      return;
    }
    add(product, 1);
    toast.success("Añadido correctamente");
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={cn(
        "inline-flex items-center justify-center gap-2 w-full font-semibold transition-colors",
        variant === "card" &&
          "py-3 rounded-lg text-sm border border-primary/35 bg-card text-primary hover:bg-primary/8 hover:border-primary/50",
        variant === "detail" &&
          "py-4 px-6 rounded-xl text-base border-2 border-primary/40 bg-background text-primary hover:bg-primary/10 sm:w-auto",
        className,
      )}
    >
      <ShoppingCart className="size-4 shrink-0" aria-hidden />
      Añadir al carrito
    </button>
  );
}
