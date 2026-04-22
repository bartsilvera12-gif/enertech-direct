import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { fetchHeroSliderProducts } from "@/services/storeService";
import { cn } from "@/lib/utils";

/** Logo lockup oficial (Cloudinary — mismo activo que campañas Enertech). */
const HERO_BRAND_LOCKUP_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/f_auto,q_auto,w_560/v1776878281/WhatsApp_Image_2026-04-20_at_12.37.03_PM_1_urm0xb.png";

const SLIDER_FALLBACK_IMG =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880618/ed87b586-7ad8-442b-aac0-5826742a33b1.png";

const AUTOPLAY_MS = 4000;

export function HomeHero() {
  const { data: sliderProducts = [] } = useQuery({
    queryKey: ["products", "hero-slider"],
    queryFn: () => fetchHeroSliderProducts(5),
    staleTime: 60_000,
  });

  const slides = useMemo(() => {
    const items = sliderProducts
      .filter((p) => p.mainImageUrl)
      .slice(0, 5)
      .map((p) => ({ url: p.mainImageUrl as string, key: p.id, alt: p.name }));
    return items.length ? items : [{ url: SLIDER_FALLBACK_IMG, key: "fallback", alt: "Enertech" }];
  }, [sliderProducts]);

  return (
    <section className="relative overflow-hidden border-b border-[hsl(var(--strategic)/0.12)]">
      {/* Fondo: claro + acentos rojo marca + verde muy suave */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-background via-[hsl(var(--strategic)/0.045)] to-[hsl(var(--primary)/0.06)] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.09] pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 55% at 78% 22%, hsl(var(--strategic) / 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 12% 65%, hsl(var(--primary) / 0.22) 0%, transparent 50%),
            repeating-linear-gradient(
              -12deg,
              transparent 0,
              transparent 38px,
              hsl(var(--strategic) / 0.045) 38px,
              hsl(var(--strategic) / 0.045) 39px
            ),
            repeating-linear-gradient(
              102deg,
              transparent 0,
              transparent 52px,
              hsl(var(--strategic) / 0.035) 52px,
              hsl(var(--strategic) / 0.035) 53px
            )
          `,
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--strategic)/0.07)_1px,transparent_0)] bg-[length:28px_28px] opacity-40 pointer-events-none" aria-hidden />

      <div className="relative container">
        <div
          className="grid lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center py-12 md:py-16 lg:py-[4.25rem]"
          style={{ clipPath: "none" }}
        >
          {/* Columna texto — protagonista */}
          <div className="lg:col-span-7 xl:col-span-7 max-w-xl lg:max-w-none">
            <div className="mb-6 md:mb-8">
              <img
                src={HERO_BRAND_LOCKUP_URL}
                alt="Enertech — Energía e insumos"
                className="h-11 sm:h-12 md:h-[3.25rem] w-auto max-w-[min(100%,280px)] object-contain object-left drop-shadow-[0_1px_12px_hsl(var(--strategic)/0.15)]"
                width={280}
                height={56}
                decoding="async"
              />
            </div>

            <h1 className="text-[1.65rem] sm:text-4xl md:text-[2.35rem] lg:text-[2.65rem] font-semibold tracking-tight leading-[1.12] text-balance text-foreground">
              Soluciones en informática e insumos para tu empresa
            </h1>
            <p className="mt-5 md:mt-6 text-muted-foreground text-base md:text-lg leading-relaxed max-w-[46ch]">
              Impresoras, consumibles, computación y accesorios con soporte técnico. Consultá disponibilidad por WhatsApp.
            </p>

            <div className="mt-8 md:mt-10 flex flex-wrap gap-3 sm:gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.55)] hover:bg-primary-deep transition-colors"
              >
                Ver productos
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://wa.me/595981000000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-card text-strategic border border-strategic/25 px-7 py-3.5 text-sm font-semibold shadow-sm hover:bg-strategic hover:text-strategic-foreground hover:border-strategic transition-colors"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            </div>
          </div>

          {/* Columna slider — contenida, no domina */}
          <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[min(100%,380px)] xl:max-w-[400px]">
              <HeroProductSlider slides={slides} />
            </div>
          </div>
        </div>
      </div>

      {/* Transición al contenido siguiente (respira, no “tapa” el hero) */}
      <div className="h-8 md:h-10 bg-gradient-to-b from-transparent to-background" aria-hidden />
    </section>
  );
}

type Slide = { url: string; key: string; alt: string };

function HeroProductSlider({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slideSig = slides.map((s) => s.key).join("|");

  useEffect(() => {
    setIndex(0);
  }, [slideSig]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [slides.length, paused]);

  return (
    <div
      className="relative rounded-2xl border border-[hsl(var(--strategic)/0.14)] bg-card/80 shadow-[0_20px_50px_-24px_hsl(var(--foreground)/0.25)] backdrop-blur-sm overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] sm:aspect-[5/4] bg-muted/30">
        {slides.map((slide, i) => (
          <img
            key={slide.key}
            src={slide.url}
            alt={slide.alt}
            className={cn(
              "absolute inset-0 size-full object-contain p-4 sm:p-5 transition-opacity duration-700 ease-out",
              i === index ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none",
            )}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background)/0.08)] via-transparent to-transparent pointer-events-none z-[2]"
          aria-hidden
        />
      </div>

      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3.5 bg-gradient-to-t from-muted/40 to-transparent">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "rounded-full transition-all duration-300",
                i === index ? "h-2 w-6 bg-primary shadow-sm" : "h-1.5 w-1.5 bg-foreground/20 hover:bg-foreground/35",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
