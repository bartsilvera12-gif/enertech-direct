import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";
import type { OrderConfirmation } from "@/types";
import { formatPYG } from "@/services/storeService";

const OrderSent = () => {
  const [order, setOrder] = useState<OrderConfirmation | null>(null);

  useEffect(() => {
    document.title = "Pedido enviado — Enertech";
    const raw = sessionStorage.getItem("enertech-last-order");
    if (raw) setOrder(JSON.parse(raw));
  }, []);

  return (
    <div className="container py-20 md:py-28">
      <div className="max-w-2xl mx-auto text-center">
        <div className="size-16 rounded-full bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center mb-8 animate-fade-in">
          <CheckCircle2 className="size-8 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance animate-fade-up">
          Tu pedido fue generado.
        </h1>
        <p className="mt-5 text-muted-foreground leading-relaxed animate-fade-up [animation-delay:120ms]">
          Te redirigimos a WhatsApp con el resumen prellenado. Si la pestaña no se abrió,
          podés reenviarlo desde el botón de abajo.
        </p>

        {order && (
          <div className="mt-10 rounded-3xl bg-surface hairline p-6 md:p-8 text-left animate-fade-up [animation-delay:200ms]">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
              <div>
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Número de pedido</span>
                <div className="text-xl font-semibold price-tabular mt-1">{order.orderNumber}</div>
              </div>
              <span className="text-xs uppercase tracking-widest font-medium px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                Enviado por WhatsApp
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-white/5 pt-4">
              <span className="text-muted-foreground">{order.itemsCount} producto{order.itemsCount !== 1 ? "s" : ""}</span>
              <span className="text-lg font-semibold text-primary price-tabular">{formatPYG(order.total)}</span>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-up [animation-delay:280ms]">
          {order && (
            <a
              href={order.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:shadow-glow transition-all"
            >
              <MessageCircle className="size-4" /> Reenviar a WhatsApp
            </a>
          )}
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 bg-surface hairline-strong px-7 py-3.5 text-sm font-medium rounded-full hover:bg-surface-elevated transition-colors"
          >
            Seguir explorando <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSent;
