import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroSlide = { url: string; key: string; alt: string };

type Props = {
  slides: HeroSlide[];
  /** Intervalo entre cambios automáticos (ms). Por defecto 4000 (rango pedido 3–5 s). */
  autoplayMs?: number;
  className?: string;
};

/**
 * Carrusel del hero: autoplay con pausa al hover, transición por opacidad,
 * flechas si hay más de una imagen, puntos inferiores. Las imágenes usan object-contain para no deformar.
 */
export function HeroProductCarousel({ slides, autoplayMs = 4000, className }: Props) {
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
    }, autoplayMs);
    return () => window.clearInterval(t);
  }, [slides.length, paused, autoplayMs]);

  const validSlides = useMemo(() => slides.filter((s) => Boolean(s.url?.trim())), [slides]);

  if (validSlides.length === 0) return null;

  const showDots = validSlides.length > 1;

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-h-[380px] flex-col overflow-hidden",
        "max-w-[min(100%,360px)] sm:max-w-[min(100%,420px)] md:max-w-[min(100%,480px)] lg:max-w-none",
        "rounded-3xl border border-white/45 bg-white/[0.97] shadow-[0_32px_70px_-28px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset]",
        "ring-1 ring-black/[0.08] ring-offset-2 ring-offset-transparent",
        "backdrop-blur-[2px]",
        className,
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={cn(
          "relative mx-auto w-full overflow-hidden bg-gradient-to-b from-white via-muted/25 to-muted/35",
          "aspect-[4/3] lg:aspect-[5/4]",
          showDots ? "max-h-[calc(380px-3.25rem)]" : "max-h-[380px]",
        )}
      >
        {validSlides.map((slide, i) => (
          <img
            key={slide.key}
            src={slide.url}
            alt={slide.alt}
            className={cn(
              "absolute inset-0 h-full w-full object-contain object-center p-4 sm:p-5 lg:p-7 transition-opacity duration-700 ease-out",
              i === index ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none",
            )}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/[0.04] via-transparent to-white/[0.06] pointer-events-none z-[2]" aria-hidden />

        {showDots && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              className="absolute left-2 top-1/2 z-[3] -translate-y-1/2 inline-flex size-9 lg:size-10 items-center justify-center rounded-full bg-white/95 shadow-md text-neutral-700 hover:bg-white border border-black/[0.06]"
              onClick={() => setIndex((i) => (i - 1 + validSlides.length) % validSlides.length)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 z-[3] -translate-y-1/2 inline-flex size-9 lg:size-10 items-center justify-center rounded-full bg-white/95 shadow-md text-neutral-700 hover:bg-white border border-black/[0.06]"
              onClick={() => setIndex((i) => (i + 1) % validSlides.length)}
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {showDots && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-black/[0.07] bg-white/98 py-3 lg:py-3.5">
          {validSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "rounded-full transition-all duration-300",
                i === index ? "h-1.5 w-5 bg-primary shadow-sm" : "h-1.5 w-1.5 bg-neutral-900/25 hover:bg-neutral-900/40",
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
