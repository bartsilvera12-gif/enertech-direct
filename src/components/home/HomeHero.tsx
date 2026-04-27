import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Cpu, Server, Network, Activity } from "lucide-react";
import heroITImage from "@/assets/hero-it-infrastructure.jpg";

const HERO_LOGO_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1777286692/WhatsApp_Image_2026-04-20_at_12.37.03_PM_1_1_btnvc0.png";

/** Degradado corporativo verde tecnológico (oscuro → Enertech). */
const HERO_GRADIENT =
  "linear-gradient(125deg, hsl(160 45% 8%) 0%, hsl(150 42% 14%) 22%, hsl(120 48% 22%) 48%, hsl(95 60% 32%) 75%, hsl(82 70% 42%) 100%)";

export function HomeHero() {
  return (
    <section
      className="relative flex min-h-[calc(100vh-112px)] flex-col overflow-hidden text-white"
      style={{ background: HERO_GRADIENT }}
    >
      {/* Vignette + glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 12% 25%, hsl(82 80% 50% / 0.22) 0%, transparent 55%),
            radial-gradient(ellipse 55% 50% at 95% 65%, hsl(170 60% 8% / 0.5) 0%, transparent 60%),
            radial-gradient(ellipse 60% 45% at 50% 100%, hsl(160 50% 5% / 0.4) 0%, transparent 55%)
          `,
        }}
        aria-hidden
      />
      {/* Tech grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(0 0% 100% / 0.08) 1px, transparent 1px),
            linear-gradient(90deg, hsl(0 0% 100% / 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
          maskImage: "linear-gradient(180deg, black 0%, black 70%, transparent 100%)",
        }}
        aria-hidden
      />
      {/* Diagonal scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage: `repeating-linear-gradient(-30deg, transparent 0, transparent 56px, hsl(82 80% 60% / 0.18) 56px, hsl(82 80% 60% / 0.18) 57px)`,
        }}
        aria-hidden
      />
      {/* Floating tech icons */}
      <Server className="absolute left-[5%] top-[18%] size-20 text-white/[0.06] hidden xl:block pointer-events-none" aria-hidden />
      <Cpu className="absolute right-[8%] top-[14%] size-14 text-white/[0.07] hidden lg:block pointer-events-none" aria-hidden />
      <Network className="absolute left-[10%] bottom-[22%] size-16 text-white/[0.055] hidden lg:block pointer-events-none" aria-hidden />
      <Activity className="absolute right-[14%] bottom-[18%] size-12 text-white/[0.06] hidden lg:block pointer-events-none" aria-hidden />

      <div className="relative container flex flex-1 flex-col justify-center py-10 md:py-14 lg:py-16">
        <div className="grid w-full lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          {/* LEFT: Logo + headline */}
          <div className="lg:col-span-6 max-w-2xl">
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
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] backdrop-blur-sm px-3 py-1.5 mb-5">
              <span className="size-1.5 rounded-full bg-primary-glow animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.22em] font-semibold text-white/85">
                Soluciones IT corporativas
              </span>
            </div>

            <h1 className="text-[1.75rem] sm:text-[2.15rem] md:text-[2.45rem] lg:text-[2.75rem] xl:text-[3.1rem] font-bold tracking-tight leading-[1.08] text-balance text-white">
              VENTAS DE INFORMÁTICA<br className="hidden sm:inline" /> CORPORATIVA:{" "}
              <span className="text-primary-glow">POTENCIANDO</span> SU ÉXITO EMPRESARIAL
            </h1>

            <p className="mt-5 md:mt-6 text-base md:text-lg leading-relaxed max-w-[52ch] text-white/85">
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

          {/* RIGHT: IT infrastructure visual */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-[600px] lg:max-w-none">
              {/* Glow halo behind image */}
              <div
                className="absolute -inset-6 lg:-inset-10 rounded-[2.5rem] blur-2xl opacity-70 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, hsl(82 80% 50% / 0.35) 0%, transparent 70%)",
                }}
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-2xl lg:rounded-[1.75rem] border border-white/15 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)_inset] ring-1 ring-white/5">
                <img
                  src={heroITImage}
                  alt="Infraestructura IT corporativa Enertech: servidores, monitores y soluciones tecnológicas"
                  width={1600}
                  height={1200}
                  className="w-full h-auto object-cover aspect-[4/3] lg:aspect-[5/4]"
                  fetchPriority="high"
                  decoding="async"
                />
                {/* Subtle overlay for depth */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, transparent 0%, transparent 60%, hsl(150 50% 8% / 0.25) 100%)",
                  }}
                  aria-hidden
                />
              </div>

              {/* Floating spec card */}
              <div className="hidden md:flex absolute -bottom-5 -left-5 lg:-bottom-7 lg:-left-7 items-center gap-3 rounded-2xl border border-white/15 bg-[hsl(150_45%_10%)]/85 backdrop-blur-md px-4 py-3 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary-glow">
                  <Server className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold">
                    Infraestructura
                  </div>
                  <div className="text-sm font-bold text-white leading-tight">
                    Equipos · Redes · Soporte
                  </div>
                </div>
              </div>
            </div>
          </div>
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
