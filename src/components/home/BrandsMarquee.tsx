import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type BrandLogoItem = { src: string; alt: string };

type Props = {
  brands: BrandLogoItem[];
  className?: string;
  /** Duración aproximada de un ciclo completo del carril (segundos). */
  durationSec?: number;
};

/**
 * Carril infinito hacia la izquierda; los logos ganan escala al pasar por el centro.
 * Respeta prefers-reduced-motion (fila estática).
 */
export function BrandsMarquee({ brands, className, durationSec = 38 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [reduceMotion, setReduceMotion] = useState(false);

  const track = useMemo(() => [...brands, ...brands], [brands]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const fn = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    let rafId = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const container = containerRef.current;
      if (!container) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const cr = container.getBoundingClientRect();
      const centerX = cr.left + cr.width / 2;
      const falloff = Math.max(cr.width * 0.36, 180);
      const maxBoost = 0.22;

      itemRefs.current.forEach((el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const ix = r.left + r.width / 2;
        const dist = Math.abs(ix - centerX);
        const t = Math.min(Math.max(dist / falloff, 0), 1);
        const scale = 1 + (1 - t) * maxBoost;
        el.style.transform = `scale(${scale})`;
        el.style.zIndex = String(Math.round(scale * 50));
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [reduceMotion, track.length]);

  if (brands.length === 0) return null;

  if (reduceMotion) {
    return (
      <div className={cn("flex flex-wrap justify-center items-center gap-x-14 gap-y-10 md:gap-x-20 md:gap-y-12", className)}>
        {brands.map((b) => (
          <div key={`${b.src}-${b.alt}`} className="flex items-center justify-center px-4">
            <img
              src={b.src}
              alt={b.alt}
              className="h-16 md:h-[5rem] lg:h-[5.5rem] w-auto max-w-[220px] md:max-w-[280px] lg:max-w-[320px] object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <p className="sr-only">
        Marcas representadas: {brands.map((b) => b.alt).join(", ")}.
      </p>
      <div
        ref={containerRef}
        aria-hidden
        className={cn("relative w-full overflow-hidden py-3", className)}
        style={{ "--marquee-duration": `${durationSec}s` } as CSSProperties}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-24 bg-gradient-to-l from-background to-transparent" />

        <div className="flex w-max animate-marquee-left">
          {track.map((b, i) => (
            <div
              key={`${b.src}-${i}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="flex shrink-0 items-center justify-center px-8 sm:px-12 md:px-16 lg:px-20 will-change-transform"
              style={{ transform: "scale(1)" }}
            >
              <img
                src={b.src}
                alt={b.alt}
                className="h-16 md:h-[5rem] lg:h-[5.5rem] w-auto max-w-[220px] md:max-w-[280px] lg:max-w-[320px] object-contain select-none"
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
