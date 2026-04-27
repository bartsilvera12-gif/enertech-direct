import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/** Escena (servidor + monitores sobre mesa de vidrio). PNG sin fondo. */
const HERO_SCENE_IMAGE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777289473/Dise%C3%B1o_sin_t%C3%ADtulo_16_zpkyb0.png";

/** Pared verde estilo estudio (verde manzana). */
const WALL_GRADIENT = `
  radial-gradient(ellipse 120% 90% at 50% 35%,
    hsl(88 78% 60%) 0%,
    hsl(95 70% 50%) 45%,
    hsl(108 58% 40%) 100%
  )
`;

/** Piso/mesa de acero pulido. */
const FLOOR_GRADIENT = `
  linear-gradient(180deg,
    hsl(210 12% 80%) 0%,
    hsl(210 14% 70%) 22%,
    hsl(210 12% 58%) 60%,
    hsl(215 14% 46%) 100%
  )
`;

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden text-white">
      {/* PARED VERDE (parte superior) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[68%] -z-20"
        style={{ background: WALL_GRADIENT }}
        aria-hidden
      />
      {/* PISO METÁLICO (parte inferior) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] -z-20"
        style={{ background: FLOOR_GRADIENT }}
        aria-hidden
      />
      {/* Línea de horizonte sutil */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[68%] h-[2px] -z-10"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(0 0% 0% / 0.22), transparent)",
        }}
        aria-hidden
      />
      {/* Sombra ambiente bajo el horizonte */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[68%] h-20 -z-10"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 0% / 0.28) 0%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="container relative px-4 sm:px-6">
        {/* Grid horizontal compacto: logo izq | (texto + escena) der, ambos centrados verticalmente */}
        <div className="grid grid-cols-1 items-center gap-8 py-10 md:py-14 lg:grid-cols-12 lg:gap-6 lg:py-16">
          {/* IZQUIERDA — Logo centrado verticalmente sobre la pared */}
          <div className="flex items-center justify-center lg:col-span-5 lg:justify-end lg:pr-6">
            <img
              src={ENERTECH_BRAND_LOCKUP_URL}
              alt="Enertech — Energía e insumos"
              className="h-auto w-[min(78%,320px)] object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.22)] lg:w-[min(100%,360px)]"
              width={520}
              height={160}
              decoding="async"
              fetchPriority="high"
            />
          </div>

          {/* DERECHA — Texto arriba + escena debajo */}
          <div className="relative flex flex-col items-center lg:col-span-7 lg:items-end">
            {/* Texto */}
            <div className="text-center lg:text-right">
              <h1 className="mx-auto max-w-md text-base font-extrabold uppercase leading-[1.2] tracking-[0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,40,15,0.35)] sm:text-lg md:text-xl lg:mx-0 lg:ml-auto">
                Ventas de informática corporativa:
                <br />
                <span className="text-white">Potenciando su éxito empresarial</span>
              </h1>
              <p className="mt-2 text-xs font-medium text-white/95 drop-shadow-[0_1px_6px_rgba(0,40,15,0.35)] md:text-sm">
                Equipos, Soporte y Soluciones Integrales
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2.5 lg:justify-end">
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

            {/* Escena (servidor + monitores) — apoyada sobre el horizonte */}
            <div className="relative mt-4 w-full max-w-[460px] lg:mt-5">
              {/* Sombra de contacto */}
              <div
                className="pointer-events-none absolute -bottom-1 left-1/2 h-7 w-[78%] -translate-x-1/2 rounded-[50%]"
                style={{
                  background:
                    "radial-gradient(ellipse at center, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.18) 55%, transparent 78%)",
                  filter: "blur(10px)",
                }}
                aria-hidden
              />
              <img
                src={HERO_SCENE_IMAGE_URL}
                alt="Equipamiento informático corporativo — Enertech"
                width={1400}
                height={900}
                className="relative mx-auto block h-auto w-full object-contain"
                style={{
                  filter:
                    "drop-shadow(0 18px 22px hsl(0 0% 0% / 0.32)) drop-shadow(0 0 50px hsl(140 70% 45% / 0.18))",
                }}
                decoding="async"
                fetchPriority="high"
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
