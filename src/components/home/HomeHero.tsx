import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/**
 * Único elemento sustituible: PNG de la escena (equipo / estudio).
 * El resto replica la composición visual de la referencia Enertech.
 */
const HERO_SCENE_IMAGE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777289473/Dise%C3%B1o_sin_t%C3%ADtulo_16_zpkyb0.png";

/** Muro verde estudio: centro más claro (lima) → borde bosque (referencia tipo #4CAF50 / radial). */
const BG_STUDIO_WALL = `
  radial-gradient(ellipse 120% 95% at 50% 22%,
    hsl(88 72% 58%) 0%,
    hsl(92 68% 50%) 18%,
    hsl(105 55% 42%) 42%,
    hsl(130 48% 30%) 68%,
    hsl(155 42% 18%) 100%
),
linear-gradient(165deg,
  hsl(85 75% 54%) 0%,
  hsl(95 65% 46%) 28%,
  hsl(125 52% 34%) 58%,
  hsl(165 38% 15%) 100%
)`;

export function HomeHero() {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-112px)] flex-col overflow-x-clip overflow-y-visible text-white">
      {/* Capa 1 — pared verde corporativa (no plano): radial + diagonal */}
      <div className="pointer-events-none absolute inset-0 -z-20" style={{ background: BG_STUDIO_WALL }} aria-hidden />

      {/* Capa 2 — viñeta estudio (bordes más oscuros, centro iluminado) */}
      <div
        className="pointer-events-none absolute inset-0 -z-[19]"
        style={{
          background: `
            radial-gradient(ellipse 85% 70% at 45% 30%, hsl(0 0% 100% / 0.12) 0%, transparent 45%),
            radial-gradient(ellipse 140% 120% at 50% 100%, hsl(0 0% 0% / 0.42) 0%, transparent 55%),
            radial-gradient(ellipse 95% 90% at 50% 50%, transparent 38%, hsl(200 25% 8% / 0.35) 100%)
          `,
        }}
        aria-hidden
      />

      {/* Textura mate (grano fino sobre el verde) */}
      <svg className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
        <filter id="hero-noise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="n" />
          <feColorMatrix type="saturate" values="0" in="n" result="mono" />
          <feComponentTransfer in="mono" result="a">
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
        </filter>
      </svg>
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mix-blend-overlay"
        style={{ filter: "url(#hero-noise)" }}
        aria-hidden
      />

      <div className="relative z-0 container flex flex-1 flex-col justify-center py-10 md:py-12 lg:py-14">
        <div className="grid w-full items-center gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          {/* Izquierda — logo + titulares exactos referencia */}
          <div className="relative z-10 lg:col-span-5 xl:col-span-5 max-w-xl lg:max-w-[min(100%,38rem)]">
            <div className="mb-6 md:mb-8">
              <img
                src={ENERTECH_BRAND_LOCKUP_URL}
                alt="Enertech — Energía e insumos"
                className="h-[4.5rem] sm:h-[5.75rem] md:h-[6.75rem] lg:h-[7.25rem] xl:h-[7.75rem] w-auto max-w-[min(100%,560px)] xl:max-w-[min(100%,640px)] object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
                width={640}
                height={130}
                decoding="async"
                fetchpriority="high"
              />
            </div>

            <h1 className="text-[1.05rem] sm:text-[1.25rem] md:text-[1.45rem] lg:text-[1.65rem] xl:text-[1.85rem] font-bold uppercase tracking-[0.06em] leading-[1.2] text-white text-balance drop-shadow-[0_2px_12px_rgba(0,35,20,0.35)]">
              Ventas de informática corporativa:{" "}
              <span className="text-[hsl(62_95%_92%)] drop-shadow-[0_1px_8px_rgba(0,0,0,0.2)]">
                Potenciando su éxito empresarial
              </span>
            </h1>

            <p className="mt-4 md:mt-5 text-base md:text-lg font-medium leading-snug text-white/95 max-w-[46ch] drop-shadow-[0_1px_6px_rgba(0,35,15,0.35)]">
              Equipos, Soporte y Soluciones Integrales
            </p>

            {/* CTAs referencia: primario blanco + texto verde; WhatsApp verde marca */}
            <div className="mt-7 md:mt-9 flex flex-wrap gap-3 sm:gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm md:text-[15px] font-bold text-[hsl(142_55%_32%)] shadow-[0_14px_40px_-12px_rgba(0,0,0,0.35)] hover:bg-white/95 transition-colors"
              >
                Ver productos
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </Link>
              <a
                href="https://wa.me/595971472716"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-7 py-3.5 text-sm md:text-[15px] font-bold text-white shadow-[0_14px_40px_-12px_rgba(37,211,102,0.55)] hover:bg-[#1ebe5a] transition-colors"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            </div>

            <p className="mt-8 text-[11px] sm:text-xs tracking-wide text-white/75">
              <span className="opacity-90">www.enertechsolutions.com</span>
            </p>
          </div>

          {/* Derecha — escena integrada (misma lógica de capas; solo cambia el PNG arriba) */}
          <div className="relative z-0 lg:col-span-7 xl:col-span-7">
            <div className="relative mx-auto min-h-[min(72vw,420px)] sm:min-h-[380px] md:min-h-[440px] lg:mx-0 lg:mr-[-4vw] lg:min-h-[min(58vh,640px)] xl:mr-[-6vw] xl:min-h-[600px]">
              <div
                className="pointer-events-none absolute left-[42%] top-[46%] z-0 h-[min(78vw,520px)] w-[min(110vw,720px)] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full opacity-95"
                style={{
                  background:
                    "radial-gradient(circle, hsl(142 78% 52% / 0.5) 0%, hsl(150 65% 40% / 0.15) 48%, transparent 70%)",
                  filter: "blur(52px)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-[52%] top-[58%] z-0 h-[40%] w-[70%] max-w-[520px] -translate-x-1/2 rounded-full opacity-75"
                style={{
                  background: "radial-gradient(ellipse, hsl(88 70% 55% / 0.4) 0%, transparent 72%)",
                  filter: "blur(32px)",
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute bottom-[6%] left-1/2 z-[5] h-[18%] w-[92%] max-w-[640px] -translate-x-1/2 rounded-[50%]"
                style={{
                  background: "radial-gradient(ellipse at center, hsl(0 0% 0% / 0.5) 0%, hsl(0 0% 0% / 0.2) 45%, transparent 72%)",
                  filter: "blur(24px)",
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute bottom-0 left-[-8%] right-[-14%] z-[6] h-[32%] min-h-[120px] rounded-t-[3px]"
                style={{
                  background: `
                    linear-gradient(10deg,
                      hsl(210 18% 92% / 0.12) 0%,
                      hsl(160 22% 45% / 0.14) 38%,
                      hsl(175 35% 14% / 0.65) 100%
                    )
                  `,
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  boxShadow:
                    "inset 0 1px 0 hsl(0 0% 100% / 0.18), 0 -28px 56px -14px hsl(0 0% 0% / 0.38)",
                  maskImage: "linear-gradient(to top, black 0%, black 58%, transparent 100%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute bottom-[2%] left-[-6%] right-[-10%] z-[7] h-[14%] opacity-85"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.08) 38%, hsl(0 0% 100% / 0.14) 50%, hsl(0 0% 100% / 0.08) 62%, transparent 100%)",
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute bottom-[4%] left-[4%] right-[-6%] z-[8] h-[26%] overflow-hidden opacity-[0.22]"
                style={{
                  maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 52%, transparent 100%)",
                }}
                aria-hidden
              >
                <div
                  className="absolute inset-0 flex items-start justify-center lg:justify-end pr-[4%]"
                  style={{ transform: "scaleY(-1)" }}
                >
                  <img
                    src={HERO_SCENE_IMAGE_URL}
                    alt=""
                    className="max-h-[min(52vh,420px)] w-auto max-w-[118%] object-contain object-bottom scale-[1.07]"
                    decoding="async"
                  />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-[-6%] bottom-[10%] top-[2%] z-[9] flex items-end justify-center overflow-visible lg:justify-end lg:pr-[2%]">
                <img
                  src={HERO_SCENE_IMAGE_URL}
                  alt="Equipamiento informático corporativo — Enertech"
                  width={1200}
                  height={900}
                  className="relative h-auto max-h-[min(78vh,640px)] w-auto max-w-[122%] translate-x-[2%] scale-[1.06] object-contain object-bottom drop-shadow-[0_28px_60px_rgba(0,0,0,0.45)] sm:scale-[1.07] lg:max-h-[min(72vh,680px)] lg:translate-x-[4%] lg:scale-[1.09]"
                  style={{
                    filter:
                      "drop-shadow(0 0 80px hsl(142 72% 52% / 0.42)) drop-shadow(0 52px 95px hsl(0 0% 0% / 0.45))",
                  }}
                  decoding="async"
                  fetchpriority="high"
                />
              </div>

              <div
                className="pointer-events-none absolute inset-[-4%] z-[10] mix-blend-soft-light opacity-70"
                style={{
                  background:
                    "radial-gradient(ellipse 78% 58% at 58% 36%, hsl(85 60% 96% / 0.16) 0%, transparent 54%)",
                }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20 md:h-28"
        style={{
          background: "linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)",
        }}
        aria-hidden
      />
    </section>
  );
}
