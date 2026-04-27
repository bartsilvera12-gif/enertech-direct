import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/** Escena (servidor + monitores sobre mesa de vidrio). PNG sin fondo. */
const HERO_SCENE_IMAGE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777289473/Dise%C3%B1o_sin_t%C3%ADtulo_16_zpkyb0.png";

/** Pared verde estilo estudio (verde manzana → un poco más oscuro abajo). */
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
    hsl(210 12% 78%) 0%,
    hsl(210 14% 70%) 18%,
    hsl(210 12% 60%) 45%,
    hsl(215 14% 48%) 100%
  )
`;

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden text-white">
      {/* PARED VERDE (≈ 62% superior) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[62%] -z-20"
        style={{ background: WALL_GRADIENT }}
        aria-hidden
      />
      {/* PISO METÁLICO (≈ 38% inferior) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] -z-20"
        style={{ background: FLOOR_GRADIENT }}
        aria-hidden
      />
      {/* Línea de horizonte sutil con leve sombra */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[62%] h-[2px] -z-10"
        style={{
          background: "linear-gradient(90deg, transparent, hsl(0 0% 0% / 0.18), transparent)",
        }}
        aria-hidden
      />
      {/* Sombra ambiente bajo el horizonte (la pared proyecta sobre la mesa) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[62%] h-24 -z-10"
        style={{
          background: "linear-gradient(180deg, hsl(0 0% 0% / 0.22) 0%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="container relative px-4 sm:px-6">
        {/* Grid principal: izquierda (logo) | derecha (texto + escena) */}
        <div className="grid min-h-[calc(100vh-112px)] grid-cols-1 items-center gap-6 py-10 lg:grid-cols-12 lg:gap-8 lg:py-14">
          {/* IZQUIERDA — Logo sobre la pared */}
          <div className="flex items-center justify-center lg:col-span-5 lg:justify-start lg:pl-4">
            <img
              src={ENERTECH_BRAND_LOCKUP_URL}
              alt="Enertech — Energía e insumos"
              className="h-auto w-[min(86%,420px)] object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.22)] lg:w-[min(100%,460px)]"
              width={520}
              height={160}
              decoding="async"
              fetchpriority="high"
            />
          </div>

          {/* DERECHA — Texto arriba + escena debajo (apilados) */}
          <div className="relative lg:col-span-7">
            {/* Texto */}
            <div className="text-center lg:text-right">
              <h1 className="mx-auto max-w-2xl text-[1.05rem] font-extrabold uppercase leading-[1.2] tracking-[0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,40,15,0.35)] sm:text-xl md:text-2xl lg:mx-0 lg:ml-auto lg:max-w-[min(100%,30rem)]">
                Ventas de informática corporativa:
                <br />
                Potenciando su éxito empresarial
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-white/95 drop-shadow-[0_1px_6px_rgba(0,40,15,0.35)] md:text-base lg:mx-0 lg:ml-auto">
                Equipos, Soporte y Soluciones Integrales
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-end">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-neutral-900 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.35)] hover:bg-white/95 md:text-[15px]"
                >
                  Ver productos
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </Link>
                <a
                  href="https://wa.me/595971472716"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_40px_-12px_rgba(37,211,102,0.55)] hover:bg-[#1ebe5a] md:text-[15px]"
                >
                  <MessageCircle className="size-4 shrink-0" />
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Escena (servidor + monitores). Apoyada sobre el horizonte. */}
            <div className="relative mt-6 lg:mt-8">
              {/* Sombra de contacto bajo los equipos */}
              <div
                className="pointer-events-none absolute bottom-2 left-1/2 h-10 w-[82%] -translate-x-1/2 rounded-[50%]"
                style={{
                  background:
                    "radial-gradient(ellipse at center, hsl(0 0% 0% / 0.55) 0%, hsl(0 0% 0% / 0.18) 55%, transparent 78%)",
                  filter: "blur(14px)",
                }}
                aria-hidden
              />
              <img
                src={HERO_SCENE_IMAGE_URL}
                alt="Equipamiento informático corporativo — Enertech"
                width={1400}
                height={900}
                className="relative mx-auto block h-auto w-full max-w-[640px] object-contain"
                style={{
                  filter:
                    "drop-shadow(0 24px 28px hsl(0 0% 0% / 0.35)) drop-shadow(0 0 60px hsl(140 70% 45% / 0.18))",
                }}
                decoding="async"
                fetchpriority="high"
              />
            </div>

            {/* URL discreta abajo a la derecha */}
            <p className="mt-4 text-center text-[11px] tracking-wide text-white/85 lg:text-right">
              www.enertechsolutions.com
            </p>
          </div>
        </div>
      </div>

      {/* Fade hacia el contenido siguiente */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{ background: "linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)" }}
        aria-hidden
      />
    </section>
  );
}
