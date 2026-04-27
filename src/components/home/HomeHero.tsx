import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/** Escena (servidor + monitores). PNG sin fondo. */
const HERO_SCENE_IMAGE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777296294/Dise%C3%B1o_sin_t%C3%ADtulo_16_1_pbzj4w.png";

/** Pared verde estilo estudio (verde manzana) — ahora ocupa todo el hero. */
const WALL_GRADIENT = `
  radial-gradient(ellipse 130% 100% at 50% 40%,
    hsl(88 78% 60%) 0%,
    hsl(95 72% 52%) 45%,
    hsl(105 60% 42%) 100%
  )
`;

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden text-white">
      {/* Fondo verde completo */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{ background: WALL_GRADIENT }}
        aria-hidden
      />

      <div className="container relative px-4 sm:px-6">
        <div className="grid h-[calc(100vh-112px)] max-h-[760px] min-h-[480px] grid-cols-1 items-center gap-4 py-4 lg:grid-cols-12 lg:gap-6 lg:py-6">
          {/* IZQUIERDA — Logo arriba + título + subtítulo + CTAs */}
          <div className="flex flex-col items-center justify-center text-center lg:col-span-5 lg:items-start lg:text-left">
            <img
              src={ENERTECH_BRAND_LOCKUP_URL}
              alt="Enertech — Energía e insumos"
              className="h-auto w-[min(92%,460px)] object-contain drop-shadow-[0_10px_32px_rgba(0,0,0,0.28)] lg:w-[min(100%,560px)] xl:w-[min(100%,620px)]"
              width={520}
              height={160}
              decoding="async"
              fetchPriority="high"
            />

            <h1 className="mt-4 max-w-md text-base font-extrabold uppercase leading-[1.2] tracking-[0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,40,15,0.35)] sm:text-lg md:text-xl lg:max-w-[420px]">
              Ventas de informática corporativa:
              <br />
              Potenciando su éxito empresarial
            </h1>

            <p className="mt-2 text-sm font-semibold text-white/95 drop-shadow-[0_1px_6px_rgba(0,40,15,0.35)] md:text-base">
              Equipos, Soporte y Soluciones Integrales
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5 lg:justify-start">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold text-neutral-900 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.4)] hover:bg-white/95 md:text-sm"
              >
                Ver productos
                <ArrowRight className="size-3.5" strokeWidth={2.5} />
              </Link>
              <a
                href="https://wa.me/595971472716"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow-[0_10px_28px_-10px_rgba(37,211,102,0.55)] hover:bg-[#1ebe5a] md:text-sm"
              >
                <MessageCircle className="size-3.5 shrink-0" />
                WhatsApp
              </a>
            </div>

            <p className="mt-3 text-[10px] tracking-wide text-white/85">
              www.enertechsolutions.com
            </p>
          </div>

          {/* DERECHA — Escena de equipos grande con efecto 3D */}
          <div
            className="relative flex h-full items-center justify-center lg:col-span-7 lg:justify-end"
            style={{ perspective: "1400px" }}
          >
            <div className="group relative w-full max-w-[560px] lg:max-w-[760px] xl:max-w-[860px]">
              {/* Halo verde de fondo (profundidad) */}
              <div
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 60% at 55% 50%, hsl(140 80% 55% / 0.45) 0%, transparent 70%)",
                  filter: "blur(40px)",
                  transform: "translateZ(-80px)",
                }}
                aria-hidden
              />
              {/* Sombra de contacto proyectada */}
              <div
                className="pointer-events-none absolute -bottom-4 left-1/2 h-14 w-[82%] -translate-x-1/2 rounded-[50%]"
                style={{
                  background:
                    "radial-gradient(ellipse at center, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.22) 50%, transparent 78%)",
                  filter: "blur(18px)",
                  transform: "rotateX(70deg)",
                  transformOrigin: "50% 100%",
                }}
                aria-hidden
              />
              <img
                src={HERO_SCENE_IMAGE_URL}
                alt="Equipamiento informático corporativo — Enertech"
                width={1400}
                height={900}
                className="relative mx-auto block h-auto max-h-[min(90vh,860px)] w-full object-contain transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.02]"
                style={{
                  transform: "rotateY(-8deg) rotateX(4deg) scale(1.06)",
                  transformOrigin: "60% 60%",
                  filter:
                    "drop-shadow(0 32px 36px hsl(0 0% 0% / 0.45)) drop-shadow(0 12px 18px hsl(0 0% 0% / 0.35)) drop-shadow(0 0 80px hsl(140 75% 50% / 0.35))",
                }}
                decoding="async"
                fetchPriority="high"
              />
              {/* Reflejo especular sutil (highlight superior izquierdo) */}
              <div
                className="pointer-events-none absolute inset-0 -z-[1] mix-blend-screen opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse 40% 30% at 30% 20%, hsl(0 0% 100% / 0.35) 0%, transparent 70%)",
                }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fade hacia el contenido siguiente */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
        style={{ background: "linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)" }}
        aria-hidden
      />
    </section>
  );
}
