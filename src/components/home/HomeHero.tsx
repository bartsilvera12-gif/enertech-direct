import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Cpu, Server, Network, Activity } from "lucide-react";
import heroSceneImage from "@/assets/hero-it-scene-green.png";

const HERO_LOGO_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777286692/WhatsApp_Image_2026-04-20_at_12.37.03_PM_1_1_btnvc0.png";

const HERO_SCENE_IMAGE = heroSceneImage;

/** Verde manzana vivo con degradado sutil (fallback / capas). */
const HERO_GRADIENT =
  "linear-gradient(135deg, hsl(88 72% 58%) 0%, hsl(92 75% 52%) 35%, hsl(96 78% 46%) 70%, hsl(100 70% 40%) 100%)";

export function HomeHero() {
  return (
    <section
      className="relative flex min-h-[calc(100vh-112px)] flex-col overflow-hidden"
      style={{ background: HERO_GRADIENT }}
    >
      {/* Imagen de escena IT como fondo integrado */}
      <img
        src={HERO_SCENE_IMAGE}
        alt="Infraestructura IT corporativa Enertech: servidores, monitores y soluciones tecnológicas"
        className="absolute inset-0 w-full h-full object-cover object-right z-0 select-none pointer-events-none"
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />
      {/* Vignette para asegurar legibilidad del texto a la izquierda */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            "linear-gradient(90deg, hsl(95 75% 50% / 0.92) 0%, hsl(95 75% 50% / 0.65) 28%, hsl(95 75% 50% / 0.15) 50%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative container flex flex-1 flex-col justify-center py-10 md:py-14 lg:py-16 z-[3]">
        <div className="grid w-full lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* LEFT: Logo + headline */}
          <div className="lg:col-span-6 max-w-2xl relative z-[20]">
            <div className="mb-7 md:mb-8">
              <img
                src={HERO_LOGO_URL}
                alt="Enertech — Energía e insumos"
                className="h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 w-auto max-w-[min(100%,520px)] object-contain object-left drop-shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                width={520}
                height={140}
                decoding="async"
                fetchPriority="high"
              />
            </div>

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/20 backdrop-blur-md px-3 py-1.5 mb-5 shadow-sm">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                Soluciones IT corporativas
              </span>
            </div>

            <h1 className="text-[1.75rem] sm:text-[2.15rem] md:text-[2.45rem] lg:text-[2.75rem] xl:text-[3.1rem] font-bold tracking-tight leading-[1.08] text-balance text-white drop-shadow-[0_3px_12px_rgba(15,55,15,0.45)]">
              VENTAS DE INFORMÁTICA<br className="hidden sm:inline" /> CORPORATIVA:{" "}
              <span className="text-[hsl(60_95%_88%)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">POTENCIANDO</span> SU ÉXITO EMPRESARIAL
            </h1>

            <p className="mt-5 md:mt-6 text-base md:text-lg leading-relaxed max-w-[52ch] text-white drop-shadow-[0_2px_6px_rgba(15,55,15,0.4)]">
              Equipos, soporte y soluciones integrales para empresas. Infraestructura, redes y
              tecnología corporativa con respaldo profesional.
            </p>

            <div className="mt-7 md:mt-9 flex flex-wrap gap-3 sm:gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-xl bg-white text-[hsl(150_45%_15%)] px-7 py-3.5 text-sm md:text-[15px] font-bold shadow-[0_16px_44px_-10px_rgba(0,0,0,0.45)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.55)] hover:bg-white/95 transition-all"
              >
                Ver productos
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="https://wa.me/595971472716"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] text-white px-7 py-3.5 text-sm md:text-[15px] font-bold shadow-[0_16px_44px_-12px_rgba(37,211,102,0.7)] hover:bg-[#1ebe5a] transition-colors"
              >
                <MessageCircle className="size-4 shrink-0" />
                WhatsApp
              </a>
            </div>

            {/* Mini trust strip */}
            <div className="mt-9 md:mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] uppercase tracking-[0.18em] text-white/65 font-medium">
              <span>Servidores</span>
              <span className="size-1 rounded-full bg-white/30" aria-hidden />
              <span>Redes</span>
              <span className="size-1 rounded-full bg-white/30" aria-hidden />
              <span>Soporte 24/7</span>
              <span className="size-1 rounded-full bg-white/30" aria-hidden />
              <span>Insumos</span>
            </div>
          </div>

          {/* Spacer derecho — la imagen real está absoluta sobre la <section> */}
          <div className="hidden lg:block lg:col-span-6" aria-hidden />
        </div>
      </div>



      {/* Bottom edge fade for smooth transition into next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(var(--background)) 100%)",
        }}
        aria-hidden
      />
    </section>
  );
}
