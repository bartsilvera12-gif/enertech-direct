import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Zap, Shield, Headphones, Cpu } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";

const Home = () => {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: featured = [] } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featuredOnly: true }),
  });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 glow-radial pointer-events-none" />
        <div className="container relative pt-20 pb-28 md:pt-32 md:pb-40">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground border border-white/10 rounded-full px-3 py-1 mb-8 animate-fade-in">
              <span className="size-1.5 rounded-full bg-primary animate-pulse-glow" />
              Nueva generación 2026
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter leading-[0.92] text-balance animate-fade-up">
              Energía sintetizada<br />
              para el <span className="text-primary">futuro constante</span>.
            </h1>
            <p className="mt-8 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-up [animation-delay:120ms]">
              Sistemas premium de generación, almacenamiento y conversión.
              Diseñados con precisión, respaldados por soporte experto.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 animate-fade-up [animation-delay:200ms]">
              <Link
                to="/catalog"
                className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:shadow-glow transition-all"
              >
                Explorar catálogo
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/catalog?featured=1"
                className="inline-flex items-center gap-2 bg-surface hairline-strong px-7 py-3.5 text-sm font-medium rounded-full hover:bg-surface-elevated transition-colors"
              >
                Ver destacados
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Categorías</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Sistemas por dominio</h2>
          </div>
          <Link to="/catalog" className="hidden md:inline-flex text-sm text-muted-foreground hover:text-primary transition-colors items-center gap-1">
            Ver todo <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/catalog?cat=${c.slug}`}
              className="group relative aspect-[4/5] rounded-2xl bg-surface hairline overflow-hidden hover:bg-surface-elevated transition-all hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-radial-glow opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <h3 className="text-base font-medium leading-tight">{c.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                <ArrowRight className="size-4 mt-3 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="container py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Destacados</span>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Los más solicitados</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.slice(0, 6).map((p) => (
            <ProductCardPremium key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* WHY ENERTECH */}
      <section id="por-que" className="container py-24">
        <div className="max-w-2xl mb-12">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Por qué Enertech</span>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2 text-balance">
            Ingeniería de precisión, sin compromisos.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Zap, title: "Eficiencia récord", desc: "Componentes seleccionados por su rendimiento sostenido a largo plazo." },
            { icon: Shield, title: "Garantía extendida", desc: "Hasta 25 años de respaldo en sistemas de generación." },
            { icon: Cpu, title: "Tecnología tier-1", desc: "Topologías avanzadas con monitoreo en tiempo real." },
            { icon: Headphones, title: "Soporte directo", desc: "Atención humana por WhatsApp, antes y después de la compra." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-surface hairline p-6">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Icon className="size-5" />
              </div>
              <h3 className="font-medium mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA TRUST */}
      <section className="container py-20">
        <div className="rounded-3xl bg-surface hairline p-10 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 glow-radial opacity-60 pointer-events-none" />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
              Cierre directo por WhatsApp.<br />
              <span className="text-primary">Sin fricciones.</span>
            </h2>
            <p className="mt-5 text-muted-foreground max-w-lg leading-relaxed">
              Cargá tu pedido, completás tus datos, y un asesor te acompaña por WhatsApp para
              confirmar disponibilidad, pago y entrega.
            </p>
            <Link
              to="/catalog"
              className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold rounded-full hover:shadow-glow transition-all"
            >
              Empezar ahora <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
