import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

/** PNG sustituible — composición tipo flyer (equipo / escritorio). */
const HERO_SCENE_IMAGE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777289473/Dise%C3%B1o_sin_t%C3%ADtulo_16_zpkyb0.png";

/** Igual referencia: verde vivo al centro, bosque en bordes. */
const BG_STUDIO_WALL = `
  radial-gradient(ellipse 100% 95% at 50% 28%,
    hsl(88 72% 58%) 0%,
    hsl(92 68% 50%) 22%,
    hsl(105 55% 42%) 48%,
    hsl(130 48% 30%) 72%,
    hsl(155 42% 18%) 100%
),
linear-gradient(175deg,
  hsl(85 75% 54%) 0%,
  hsl(95 65% 46%) 30%,
  hsl(125 52% 34%) 62%,
  hsl(165 38% 15%) 100%
)`;

export function HomeHero() {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-112px)] flex-col overflow-x-clip text-white">
      <div className="pointer-events-none absolute inset-0 -z-20" style={{ background: BG_STUDIO_WALL }} aria-hidden />

      <div
        className="pointer-events-none absolute inset-0 -z-[19]"
        style={{
          background: `
            radial-gradient(ellipse 90% 65% at 50% 25%, hsl(0 0% 100% / 0.14) 0%, transparent 46%),
            radial-gradient(ellipse 130% 100% at 50% 105%, hsl(0 0% 0% / 0.45) 0%, transparent 52%),
            radial-gradient(ellipse 95% 90% at 50% 50%, transparent 36%, hsl(200 25% 8% / 0.38) 100%)
          `,
        }}
        aria-hidden
      />

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

      <div className="relative z-0 container flex flex-1 flex-col px-4 sm:px-6">
        {/* Referencia vertical → web: MITAD SUPERIOR = pared verde | MITAD INFERIOR = escena (escritorio). */}
        {/* Superior: logo solo IZQUIERDA · titular + subtítulo + CTAs DERECHA (alineado fin). */}
        <div className="grid w-full grid-cols-1 gap-10 pt-10 pb-6 lg:grid-cols-12 lg:gap-8 lg:pt-12 lg:pb-10 xl:gap-10">
          <div className="flex justify-start lg:col-span-5 lg:col-start-1">
            <img
              src={ENERTECH_BRAND_LOCKUP_URL}
              alt="Enertech — Energía e insumos"
              className="h-[4.25rem] w-auto max-w-[min(100%,420px)] object-contain object-left drop-shadow-[0_4px_24px_rgba(0,0,0,0.22)] sm:h-[5rem] md:h-[5.75rem] lg:h-[6.5rem] xl:h-[7rem]"
              width={520}
              height={120}
              decoding="async"
              fetchpriority="high"
            />
          </div>

          <div className="flex flex-col items-stretch text-left lg:col-span-7 lg:col-start-6 lg:items-end lg:text-right">
            <h1 className="max-w-2xl text-[1.05rem] font-bold uppercase tracking-[0.06em] leading-[1.2] text-white drop-shadow-[0_2px_12px_rgba(0,35,20,0.35)] sm:text-[1.2rem] md:text-[1.4rem] lg:max-w-[min(100%,34rem)] lg:text-[1.55rem] xl:text-[1.75rem]">
              Ventas de informática corporativa:{" "}
              <span className="text-[hsl(62_95%_92%)]">Potenciando su éxito empresarial</span>
            </h1>
            <p className="mt-4 max-w-xl text-base font-medium leading-snug text-white/95 drop-shadow-[0_1px_6px_rgba(0,35,15,0.35)] md:text-lg lg:max-w-[min(100%,30rem)]">
              Equipos, Soporte y Soluciones Integrales
            </p>
            <div className="mt-7 flex flex-wrap gap-3 lg:justify-end">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-neutral-900 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.35)] hover:bg-white/95 md:px-7 md:py-3.5 md:text-[15px]"
              >
                Ver productos
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </Link>
              <a
                href="https://wa.me/595971472716"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_40px_-12px_rgba(37,211,102,0.55)] hover:bg-[#1ebe5a] md:px-7 md:py-3.5 md:text-[15px]"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            </div>
            <p className="mt-8 text-[11px] tracking-wide text-white/80 lg:self-end">
              www.enertechsolutions.com
            </p>
          </div>
        </div>

        {/* Inferior: escena a ancho del contenedor (como la mesa/equipo en la mitad baja del flyer). */}
        <div className="relative mt-auto min-h-[min(52vw,280px)] flex-1 sm:min-h-[320px] md:min-h-[380px] lg:min-h-[min(46vh,560px)] xl:min-h-[min(48vh,620px)]">
          <div
            className="pointer-events-none absolute bottom-[18%] left-1/2 z-0 h-[26%] w-[95%] max-w-[900px] -translate-x-1/2 rounded-[50%]"
            style={{
              background: "radial-gradient(ellipse at center, hsl(0 0% 0% / 0.5) 0%, hsl(0 0% 0% / 0.18) 45%, transparent 72%)",
              filter: "blur(26px)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-[40%] z-0 h-[min(70vw,480px)] w-[min(130vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90"
            style={{
              background: "radial-gradient(circle, hsl(142 78% 52% / 0.38) 0%, transparent 68%)",
              filter: "blur(48px)",
            }}
            aria-hidden
          />

          <div
            className="pointer-events-none absolute bottom-0 left-[-4%] right-[-4%] z-[1] h-[38%] min-h-[100px]"
            style={{
              background: `
                linear-gradient(8deg,
                  hsl(210 18% 92% / 0.1) 0%,
                  hsl(160 22% 42% / 0.12) 40%,
                  hsl(175 38% 12% / 0.58) 100%
                )
              `,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              maskImage: "linear-gradient(to top, black 0%, black 62%, transparent 100%)",
              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.12)",
            }}
            aria-hidden
          />

          <div
            className="pointer-events-none absolute bottom-[3%] left-[4%] right-[4%] z-[2] h-[28%] overflow-hidden opacity-[0.26]"
            style={{
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.12) 58%, transparent 100%)",
            }}
            aria-hidden
          >
            <div className="flex h-full w-full items-start justify-center" style={{ transform: "scaleY(-1)" }}>
              <img
                src={HERO_SCENE_IMAGE_URL}
                alt=""
                className="max-h-[min(48vh,480px)] w-auto max-w-[min(100%,1200px)] object-contain object-bottom"
                decoding="async"
              />
            </div>
          </div>

          <div
            className="relative z-[3] flex h-full w-full items-end justify-center px-0"
            style={{ perspective: "1600px" }}
          >
            <img
              src={HERO_SCENE_IMAGE_URL}
              alt="Equipamiento informático corporativo — Enertech"
              width={1600}
              height={1000}
              className="relative h-auto w-auto max-h-[min(52vh,640px)] max-w-[min(100%,min(1400px,95vw))] object-contain object-bottom sm:max-h-[min(50vh,680px)] lg:max-h-[min(48vh,720px)]"
              style={{
                transform: "rotateX(1.5deg) scale(1.05)",
                transformOrigin: "50% 100%",
                filter:
                  "drop-shadow(0 0 80px hsl(142 72% 48% / 0.38)) drop-shadow(0 50px 90px hsl(0 0% 0% / 0.42))",
              }}
              decoding="async"
              fetchpriority="high"
            />
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-16 md:h-24"
        style={{
          background: "linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)",
        }}
        aria-hidden
      />
    </section>
  );
}
