import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { fetchHeroSliderProducts } from "@/services/storeService";
import { HeroProductCarousel } from "@/components/home/HeroProductCarousel";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/** Solo si no hay ningún producto con imagen en BD (evita romper layout). */
const SLIDER_FALLBACK_IMG =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880618/ed87b586-7ad8-442b-aac0-5826742a33b1.png";

/** Entre 3 y 5 s según briefing; 4 s por defecto. */
const HERO_AUTOPLAY_MS = 4000;

/** Rojo marca intenso (alineado a --strategic en tokens). */
const heroRed = "hsl(var(--strategic))";

/** Corte inferior tipo V / chevrón invertido (punta al centro inferior). */
const HERO_CLIP =
  "polygon(0 0, 100% 0, 100% calc(100% - clamp(52px, 9vw, 96px)), 50% 100%, 0 calc(100% - clamp(52px, 9vw, 96px)))";

export function HomeHero() {
  const { data: sliderProducts = [] } = useQuery({
    queryKey: ["products", "hero-slider"],
    queryFn: () => fetchHeroSliderProducts(5),
    staleTime: 60_000,
  });

  const slides = useMemo(() => {
    const items = sliderProducts
      .filter((p) => p.mainImageUrl?.trim())
      .slice(0, 5)
      .map((p) => ({ url: p.mainImageUrl as string, key: p.id, alt: p.name }));
    return items.length ? items : [{ url: SLIDER_FALLBACK_IMG, key: "fallback", alt: "Enertech" }];
  }, [sliderProducts]);

  const hasDbSlides = sliderProducts.some((p) => p.mainImageUrl?.trim());

  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        backgroundColor: heroRed,
        clipPath: HERO_CLIP,
      }}
    >
      {/* Profundidad sutil + patrón tech más oscuro a la derecha */}
      <div
        className="absolute inset-0 pointer-events-none opacity-95"
        style={{
          background: `
            radial-gradient(ellipse 70% 90% at 100% 45%, hsl(0 0% 0% / 0.14) 0%, transparent 58%),
            radial-gradient(ellipse 55% 70% at 0% 80%, hsl(0 0% 100% / 0.06) 0%, transparent 45%)
          `,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.14] mix-blend-overlay"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              -18deg,
              transparent 0,
              transparent 34px,
              hsl(0 0% 100% / 0.06) 34px,
              hsl(0 0% 100% / 0.06) 35px
            ),
            repeating-linear-gradient(
              96deg,
              transparent 0,
              transparent 46px,
              hsl(0 0% 100% / 0.045) 46px,
              hsl(0 0% 100% / 0.045) 47px
            )
          `,
        }}
        aria-hidden
      />
      <div
        className="absolute top-0 right-0 h-[78%] w-[52%] opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100% / 0.07) 1px, transparent 0)`,
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(-90deg, black 35%, transparent 92%)",
        }}
        aria-hidden
      />

      <div className="relative container pb-[clamp(5rem,14vw,8.5rem)] pt-12 md:pt-16 lg:pt-[4.75rem]">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          {/* Texto: ~42% — legible; carrusel pasa a ~58% para más protagonismo visual */}
          <div className="lg:col-span-5 xl:col-span-5 max-w-xl lg:max-w-[min(100%,36rem)]">
            <div className="mb-10 md:mb-12">
              <img
                src={ENERTECH_BRAND_LOCKUP_URL}
                alt="Enertech — Energía e insumos"
                className="h-[5.75rem] sm:h-[7rem] md:h-[8.25rem] lg:h-[9rem] xl:h-[9.75rem] w-auto max-w-[min(100%,640px)] xl:max-w-[min(100%,760px)] object-contain object-left drop-shadow-[0_6px_32px_rgba(0,0,0,0.28)]"
                width={760}
                height={152}
                decoding="async"
              />
            </div>

            <h1 className="text-[1.65rem] sm:text-4xl md:text-[2.45rem] lg:text-[2.85rem] font-semibold tracking-tight leading-[1.12] text-balance text-white">
              Soluciones en informática e insumos para tu empresa
            </h1>
            <p className="mt-5 md:mt-6 text-base md:text-lg leading-relaxed max-w-[46ch] text-white/85">
              Impresoras, consumibles, computación y accesorios con soporte técnico. Consultá disponibilidad por WhatsApp.
            </p>

            <div className="mt-8 md:mt-10 flex flex-wrap gap-3 sm:gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold shadow-[0_12px_36px_-8px_rgba(0,0,0,0.35)] hover:bg-primary-deep transition-colors"
              >
                Ver productos
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://wa.me/595971472716"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[hsl(var(--strategic))] shadow-[0_8px_28px_-10px_rgba(0,0,0,0.35)] hover:bg-white/95 transition-colors border border-white/90"
              >
                <MessageCircle className="size-4 shrink-0 text-[hsl(var(--strategic))]" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 xl:col-span-7 flex justify-center lg:justify-end lg:self-stretch lg:pt-0">
            <div className="relative w-full max-w-[min(100%,420px)] sm:max-w-[min(100%,480px)] md:max-w-[min(100%,520px)] lg:max-w-none flex flex-col items-center lg:items-stretch gap-3">
              <HeroProductCarousel slides={slides} autoplayMs={HERO_AUTOPLAY_MS} className="lg:w-full" />
              {hasDbSlides ? (
                <p className="text-[11px] text-white/55 text-center lg:text-right max-w-none lg:ml-auto hidden sm:block">
                  Productos del catálogo
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
