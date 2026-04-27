import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight, MessageCircle, Cpu, Server, Network } from "lucide-react";
import { fetchHeroSliderProducts } from "@/services/storeService";
import { HeroProductCarousel } from "@/components/home/HeroProductCarousel";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/** Solo si no hay ningún producto con imagen en BD (evita romper layout). */
const SLIDER_FALLBACK_IMG =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880618/ed87b586-7ad8-442b-aac0-5826742a33b1.png";

/** Entre 3 y 5 s según briefing; 4 s por defecto. */
const HERO_AUTOPLAY_MS = 4000;

/** Degradado corporativo verde tecnológico (oscuro → Enertech). */
const HERO_GRADIENT =
  "linear-gradient(155deg, hsl(168 42% 11%) 0%, hsl(152 38% 16%) 28%, hsl(136 42% 22%) 55%, hsl(78 58% 34%) 88%, hsl(78 52% 40%) 100%)";

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
      className="relative flex min-h-[calc(100vh-112px)] flex-col overflow-hidden text-white"
      style={{
        background: HERO_GRADIENT,
        clipPath: HERO_CLIP,
      }}
    >
      {/* Brillo y viñeta */}
      <div
        className="absolute inset-0 pointer-events-none opacity-100"
        style={{
          background: `
            radial-gradient(ellipse 85% 70% at 15% 20%, hsl(78 70% 50% / 0.18) 0%, transparent 52%),
            radial-gradient(ellipse 60% 55% at 92% 55%, hsl(180 35% 8% / 0.45) 0%, transparent 58%),
            radial-gradient(ellipse 50% 45% at 40% 95%, hsl(0 0% 0% / 0.22) 0%, transparent 50%)
          `,
        }}
        aria-hidden
      />
      {/* Cuadrícula / red tech */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(0 0% 100% / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, hsl(0 0% 100% / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(-185deg, black 0%, black 65%, transparent 100%)",
        }}
        aria-hidden
      />
      {/* Líneas diagonales sutiles */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.09] mix-blend-overlay"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              -28deg,
              transparent 0,
              transparent 48px,
              hsl(0 0% 100% / 0.05) 48px,
              hsl(0 0% 100% / 0.05) 49px
            )
          `,
        }}
        aria-hidden
      />
      {/* Iconos tecnológicos decorativos */}
      <Server
        className="absolute left-[6%] top-[18%] size-16 text-white/[0.07] hidden xl:block pointer-events-none"
        aria-hidden
      />
      <Cpu
        className="absolute right-[10%] top-[26%] size-12 text-white/[0.06] hidden lg:block pointer-events-none"
        aria-hidden
      />
      <Network
        className="absolute left-[12%] bottom-[28%] size-14 text-white/[0.055] hidden lg:block pointer-events-none"
        aria-hidden
      />

      <div className="relative container flex flex-1 flex-col justify-center py-6 md:py-8">
        <div className="grid w-full lg:grid-cols-12 gap-6 lg:gap-10 xl:gap-12 items-center">
          <div className="lg:col-span-5 xl:col-span-5 max-w-xl lg:max-w-[min(100%,36rem)]">
            <div className="mb-5 md:mb-6">
              <img
                src={ENERTECH_BRAND_LOCKUP_URL}
                alt="Enertech — Energía e insumos"
                className="h-[4.5rem] sm:h-[5.75rem] md:h-[6.75rem] lg:h-[7.25rem] xl:h-[7.75rem] w-auto max-w-[min(100%,560px)] xl:max-w-[min(100%,640px)] object-contain object-left drop-shadow-[0_6px_28px_rgba(0,0,0,0.26)]"
                width={640}
                height={130}
                decoding="async"
              />
            </div>

            <h1 className="text-[1.45rem] sm:text-[1.85rem] md:text-[2.05rem] lg:text-[2.35rem] xl:text-[2.55rem] font-semibold tracking-tight leading-[1.14] text-balance text-white">
              Soluciones en informática e insumos para tu empresa
            </h1>
            <p className="mt-3 md:mt-4 text-sm md:text-[0.9375rem] leading-snug max-w-[42ch] text-white/84">
              Equipos, redes, soporte e insumos para entornos corporativos. Consultá disponibilidad por WhatsApp.
            </p>

            <div className="mt-5 md:mt-6 flex flex-wrap gap-3 sm:gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-primary px-6 py-3 text-sm font-semibold shadow-[0_12px_36px_-8px_rgba(0,0,0,0.35)] hover:bg-white/95 transition-colors"
              >
                Ver productos
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://wa.me/595971472716"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-deep/95 text-white border border-white/15 px-6 py-3 text-sm font-semibold shadow-[0_8px_28px_-10px_rgba(0,0,0,0.35)] hover:bg-primary-deep transition-colors backdrop-blur-[2px]"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 xl:col-span-7 flex justify-center lg:justify-end">
            <div className="relative flex w-full max-w-[min(100%,420px)] flex-col items-center gap-3 sm:max-w-[min(100%,480px)] md:max-w-[min(100%,520px)] lg:max-w-none lg:items-stretch">
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
