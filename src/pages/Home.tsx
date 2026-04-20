import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Zap, Shield, Headphones, Cpu, Sun, Battery, Plug, Wrench, Factory, Sparkles } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";

const CAT_ICONS: Record<string, typeof Sun> = {
  "energia-solar": Sun,
  baterias: Battery,
  inversores: Plug,
  accesorios: Wrench,
  industrial: Factory,
};

const Home = () => {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: featured = [] } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featuredOnly: true }),
  });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden surface-mesh">
        {/* Decorative shapes */}
        <div className="absolute -top-32 -right-32 size-[480px] rounded-full bg-brand/5 blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-20 size-[360px] rounded-full bg-accent/10 blur-3xl pointer-events-none animate-float-slow" />

        <div className="container relative pt-16 pb-24 md:pt-28 md:pb-36">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-foreground/70 border border-foreground/15 rounded-full px-3 py-1.5 mb-8 animate-fade-in bg-surface-elevated/80 backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand animate-pulse-glow" />
              Generación 2026 · Disponible en stock
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter leading-[0.92] text-balance animate-reveal-up">
              Energía e insumos
              <br />
              para el{" "}
              <span className="relative inline-block">
                <span className="relative z-10">futuro constante</span>
                <span className="absolute inset-x-0 bottom-1.5 h-3 md:h-4 bg-accent/40 -z-0 -skew-x-3" />
              </span>
              <span className="text-brand">.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed animate-reveal-up [animation-delay:120ms]">
              Sistemas premium de generación, almacenamiento y conversión.
              Diseñados con precisión, respaldados por soporte experto.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 animate-reveal-up [animation-delay:200ms]">
              <Link
                to="/catalog"
                className="group inline-flex items-center gap-2 bg-foreground text-background px-7 py-3.5 text-sm font-semibold rounded-full hover:bg-brand transition-all duration-300 shadow-soft hover:shadow-glow"
              >
                Explorar catálogo
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/catalog?featured=1"
                className="inline-flex items-center gap-2 bg-surface-elevated hairline-strong px-7 py-3.5 text-sm font-medium rounded-full hover:bg-foreground hover:text-background transition-all"
              >
                Ver destacados
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in [animation-delay:400ms]">
              {[
                { k: "25+", v: "Años de garantía" },
                { k: "97.6%", v: "Eficiencia tier-1" },
                { k: "24/7", v: "Soporte WhatsApp" },
                { k: "+1.2k", v: "Sistemas instalados" },
              ].map((s) => (
                <div key={s.v} className="border-l-2 border-brand pl-4">
                  <div className="text-2xl md:text-3xl font-semibold tracking-tight price-tabular">{s.k}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="size-1 rounded-full bg-brand" />
              Categorías
            </span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter mt-3 text-balance">
              Sistemas por dominio
            </h2>
          </div>
          <Link
            to="/catalog"
            className="hidden md:inline-flex text-sm text-foreground hover:text-brand transition-colors items-center gap-1 group"
          >
            Ver todo
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((c, i) => {
            const Icon = CAT_ICONS[c.slug] ?? Sun;
            return (
              <Link
                key={c.id}
                to={`/catalog?cat=${c.slug}`}
                style={{ animationDelay: `${i * 80}ms` }}
                className="group relative aspect-[4/5] rounded-3xl bg-surface-elevated border border-foreground/10 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-elevated animate-reveal-up"
              >
                {/* Gradient on hover */}
                <div className="absolute inset-0 bg-gradient-ink opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Decorative ring */}
                <div className="absolute -top-16 -right-16 size-40 rounded-full bg-brand/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 animate-shimmer transition-opacity duration-500" />

                <div className="relative h-full flex flex-col justify-between p-5">
                  <div className="size-12 rounded-2xl bg-surface flex items-center justify-center text-foreground group-hover:bg-brand group-hover:text-brand-foreground transition-all duration-500 group-hover:rotate-[-6deg] group-hover:scale-110">
                    <Icon className="size-5" />
                  </div>

                  <div className="text-foreground group-hover:text-background transition-colors duration-500">
                    <h3 className="text-base md:text-lg font-semibold leading-tight tracking-tight">{c.name}</h3>
                    <p className="text-xs text-muted-foreground group-hover:text-background/60 mt-1.5 line-clamp-2 transition-colors duration-500">
                      {c.description}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-brand group-hover:text-accent transition-colors">
                      Explorar
                      <ArrowRight className="size-3 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-surface-tinted/40 pointer-events-none" />
        <div className="container relative">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Sparkles className="size-3 text-brand" />
                Destacados
              </span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter mt-3 text-balance">
                Los más solicitados
              </h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-md">
                Curados por nuestros ingenieros. Stock confirmado, entrega inmediata.
              </p>
            </div>
            <Link
              to="/catalog?featured=1"
              className="hidden md:inline-flex text-sm text-foreground hover:text-brand transition-colors items-center gap-1 group"
            >
              Ver todos
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.slice(0, 6).map((p, i) => (
              <div
                key={p.id}
                style={{ animationDelay: `${i * 90}ms` }}
                className="animate-reveal-up"
              >
                <ProductCardPremium product={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY ENERTECH */}
      <section id="por-que" className="container py-24">
        <div className="max-w-2xl mb-14">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Por qué Enertech</span>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter mt-3 text-balance">
            Ingeniería de precisión, sin compromisos.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Zap, title: "Eficiencia récord", desc: "Componentes seleccionados por su rendimiento sostenido a largo plazo." },
            { icon: Shield, title: "Garantía extendida", desc: "Hasta 25 años de respaldo en sistemas de generación." },
            { icon: Cpu, title: "Tecnología tier-1", desc: "Topologías avanzadas con monitoreo en tiempo real." },
            { icon: Headphones, title: "Soporte directo", desc: "Atención humana por WhatsApp, antes y después de la compra." },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              style={{ animationDelay: `${i * 100}ms` }}
              className="group rounded-3xl bg-surface-elevated border border-foreground/10 p-7 hover:border-foreground/30 hover:-translate-y-1 transition-all duration-500 animate-reveal-up"
            >
              <div className="size-11 rounded-2xl bg-foreground text-background flex items-center justify-center mb-6 group-hover:bg-brand transition-colors duration-300">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold mb-2 tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA TRUST — Charcoal premium with brand accent */}
      <section className="container pb-24">
        <div className="rounded-3xl bg-gradient-ink p-10 md:p-16 relative overflow-hidden shadow-elevated">
          <div className="absolute -top-32 -right-32 size-96 rounded-full bg-brand/30 blur-3xl pointer-events-none animate-float-slow" />
          <div className="absolute -bottom-20 -left-20 size-80 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="relative max-w-2xl text-background">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-background/70 border border-background/20 rounded-full px-3 py-1 mb-6">
              <span className="size-1.5 rounded-full bg-accent animate-pulse-glow" />
              Cierre asistido
            </span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter text-balance">
              Cierre directo por WhatsApp.
              <br />
              <span className="text-accent">Sin fricciones.</span>
            </h2>
            <p className="mt-5 text-background/80 max-w-lg leading-relaxed">
              Cargá tu pedido, completás tus datos, y un asesor te acompaña por WhatsApp para
              confirmar disponibilidad, pago y entrega.
            </p>
            <Link
              to="/catalog"
              className="mt-8 inline-flex items-center gap-2 bg-background text-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:bg-brand hover:text-brand-foreground transition-all duration-300 group"
            >
              Empezar ahora
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
