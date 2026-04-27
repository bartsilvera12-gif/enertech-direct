import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/** Escena tecnológica (integrada al hero; capas en composición estudio). */
const HERO_SCENE_IMAGE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777289473/Dise%C3%B1o_sin_t%C3%ADtulo_16_zpkyb0.png";

export function HomeHero() {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-112px)] flex-col overflow-x-clip overflow-y-visible text-white">
      {/* Capa fondo: gradientes radiales + luces verdes */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background: `
            radial-gradient(ellipse 120% 85% at 70% 38%, hsl(72 58% 42% / 0.55) 0%, transparent 58%),
            radial-gradient(ellipse 90% 70% at 18% 22%, hsl(88 62% 52% / 0.22) 0%, transparent 48%),
            radial-gradient(ellipse 75% 55% at 82% 72%, hsl(165 42% 22% / 0.75) 0%, transparent 55%),
            linear-gradient(168deg, hsl(165 44% 11%) 0%, hsl(148 38% 16%) 28%, hsl(132 42% 22%) 52%, hsl(82 52% 34%) 82%, hsl(76 48% 28%) 100%)
          `,
        }}
        aria-hidden
      />

      <svg className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
        <filter id="hero-noise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="n" />
          <feColorMatrix type="saturate" values="0" in="n" result="mono" />
          <feComponentTransfer in="mono" result="a">
            <feFuncA type="linear" slope="0.45" />
          </feComponentTransfer>
        </filter>
      </svg>
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.055] mix-blend-overlay"
        style={{ filter: "url(#hero-noise)" }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 95% 80% at 50% 28%, hsl(0 0% 100% / 0.14) 0%, transparent 42%),
            radial-gradient(ellipse 140% 100% at 50% 120%, hsl(0 0% 0% / 0.55) 0%, transparent 52%),
            radial-gradient(ellipse 80% 90% at 50% 50%, transparent 35%, hsl(0 0% 0% / 0.38) 100%)
          `,
        }}
        aria-hidden
      />

      <div className="relative z-0 container flex flex-1 flex-col justify-center py-8 md:py-10 lg:py-12">
        <div className="grid w-full items-center gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          <div className="relative z-10 lg:col-span-5 xl:col-span-5 max-w-xl lg:max-w-[min(100%,36rem)]">
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

          <div className="relative z-0 lg:col-span-7 xl:col-span-7">
            <div className="relative mx-auto min-h-[min(72vw,420px)] sm:min-h-[380px] md:min-h-[440px] lg:mx-0 lg:mr-[-4vw] lg:min-h-[min(58vh,640px)] xl:mr-[-6vw] xl:min-h-[600px]">
              <div
                className="pointer-events-none absolute left-[42%] top-[46%] z-0 h-[min(78vw,520px)] w-[min(110vw,720px)] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90"
                style={{
                  background: "radial-gradient(circle, hsl(142 72% 48% / 0.42) 0%, hsl(160 60% 35% / 0.12) 45%, transparent 68%)",
                  filter: "blur(48px)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-[52%] top-[58%] z-0 h-[40%] w-[70%] max-w-[520px] -translate-x-1/2 rounded-full opacity-70"
                style={{
                  background: "radial-gradient(ellipse, hsl(78 65% 45% / 0.35) 0%, transparent 70%)",
                  filter: "blur(28px)",
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute bottom-[6%] left-1/2 z-[5] h-[18%] w-[92%] max-w-[640px] -translate-x-1/2 rounded-[50%]"
                style={{
                  background: "radial-gradient(ellipse at center, hsl(0 0% 0% / 0.52) 0%, hsl(0 0% 0% / 0.22) 45%, transparent 72%)",
                  filter: "blur(22px)",
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute bottom-0 left-[-8%] right-[-14%] z-[6] h-[32%] min-h-[120px] rounded-t-[3px]"
                style={{
                  background: `
                    linear-gradient(12deg,
                      hsl(200 18% 88% / 0.07) 0%,
                      hsl(160 25% 42% / 0.12) 35%,
                      hsl(165 30% 18% / 0.55) 100%
                    )
                  `,
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow:
                    "inset 0 1px 0 hsl(0 0% 100% / 0.12), 0 -24px 48px -12px hsl(0 0% 0% / 0.35)",
                  maskImage: "linear-gradient(to top, black 0%, black 55%, transparent 100%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute bottom-[2%] left-[-6%] right-[-10%] z-[7] h-[14%] opacity-80"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.06) 40%, hsl(0 0% 100% / 0.1) 50%, hsl(0 0% 100% / 0.06) 60%, transparent 100%)",
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute bottom-[4%] left-[4%] right-[-6%] z-[8] h-[26%] overflow-hidden opacity-[0.19]"
                style={{
                  maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)",
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
                  alt="Equipamiento informático corporativo y entorno técnico Enertech"
                  width={1200}
                  height={900}
                  className="relative h-auto max-h-[min(78vh,640px)] w-auto max-w-[122%] translate-x-[2%] scale-[1.06] object-contain object-bottom drop-shadow-[0_28px_60px_rgba(0,0,0,0.45)] sm:scale-[1.07] lg:max-h-[min(72vh,680px)] lg:translate-x-[4%] lg:scale-[1.09]"
                  style={{
                    filter:
                      "drop-shadow(0 0 72px hsl(142 65% 48% / 0.38)) drop-shadow(0 50px 90px hsl(0 0% 0% / 0.42))",
                  }}
                  decoding="async"
                  fetchPriority="high"
                />
              </div>

              <div
                className="pointer-events-none absolute inset-[-4%] z-[10] mix-blend-soft-light opacity-75"
                style={{
                  background:
                    "radial-gradient(ellipse 75% 55% at 62% 38%, hsl(80 40% 96% / 0.14) 0%, transparent 52%)",
                }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-20 md:h-24"
        style={{
          background: "linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)",
        }}
        aria-hidden
      />
    </section>
  );
}
