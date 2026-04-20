import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { fetchCategories, fetchProducts, formatPYG } from "@/services/storeService";

const Home = () => {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: featured = [] } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featuredOnly: true }),
  });

  return (
    <>
      {/* HERO — editorial split layout */}
      <section className="border-b border-foreground/10">
        <div className="container py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <div className="eyebrow mb-6">— Generación 2026</div>
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-normal leading-[0.98] tracking-tight text-balance">
                Architecting tomorrow's energy.
              </h1>
              <p className="mt-8 max-w-xl text-base md:text-lg text-foreground/65 leading-relaxed">
                Sistemas precisión-ingeniería de generación, almacenamiento y conversión.
                Especificados por ingenieros, entregados con cuidado.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/catalog"
                  className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 text-sm font-medium rounded-full hover:bg-primary-deep transition-all"
                >
                  Explorar catálogo
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  to="/#por-que"
                  className="inline-flex items-center gap-2 border border-foreground/20 text-foreground px-7 py-3.5 text-sm font-medium rounded-full hover:bg-foreground hover:text-background transition-all"
                >
                  Agendar consulta
                </Link>
              </div>

              {/* Spec strip */}
              <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl">
                {[
                  { k: "25y", v: "Garantía" },
                  { k: "97.6%", v: "Eficiencia η" },
                  { k: "1,200+", v: "Sistemas" },
                ].map((s) => (
                  <div key={s.v} className="border-t border-foreground/15 pt-3">
                    <div className="text-2xl md:text-3xl font-serif font-normal spec-num">{s.k}</div>
                    <div className="eyebrow mt-1">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] bg-surface overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1000&q=80"
                  alt="Sistema fotovoltaico Enertech"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                  <div className="bg-background/95 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] font-medium spec-num">
                    Spec / 001
                  </div>
                  <div className="bg-primary text-primary-foreground px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] font-medium">
                    Disponible
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 right-5 bg-background/95 backdrop-blur p-4 flex items-center justify-between">
                  <div>
                    <div className="eyebrow mb-1">Aura X 450</div>
                    <div className="font-serif text-lg leading-tight">Panel monocristalino</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground/60">Desde</div>
                    <div className="spec-num font-medium">₲ 1.240.000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES — editorial index */}
      <section className="border-b border-foreground/10">
        <div className="container py-20 lg:py-24">
          <div className="flex items-end justify-between mb-14">
            <div>
              <div className="eyebrow mb-4">— Categorías</div>
              <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-balance max-w-xl">
                Sistemas por dominio técnico.
              </h2>
            </div>
            <Link to="/catalog" className="hidden md:inline-flex items-center gap-2 text-sm border-b border-foreground pb-0.5 hover:border-primary hover:text-primary transition-colors">
              Ver índice completo <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10">
            {categories.map((c, i) => (
              <Link
                key={c.id}
                to={`/catalog?cat=${c.slug}`}
                className="group relative bg-background p-8 lg:p-10 hover:bg-surface transition-all duration-500 min-h-[260px] flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <span className="eyebrow spec-num">
                    {String(i + 1).padStart(2, "0")} / {String(categories.length).padStart(2, "0")}
                  </span>
                  <ArrowUpRight className="size-5 text-foreground/30 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl lg:text-3xl font-normal tracking-tight leading-tight mb-3">
                    {c.name}
                  </h3>
                  <p className="text-sm text-foreground/60 leading-relaxed line-clamp-2">
                    {c.description}
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 h-px bg-primary w-0 group-hover:w-full transition-all duration-700" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED — gallery grid */}
      <section className="border-b border-foreground/10">
        <div className="container py-20 lg:py-24">
          <div className="flex items-end justify-between mb-14">
            <div>
              <div className="eyebrow mb-4">— Selección curada</div>
              <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-balance max-w-xl">
                Sistemas destacados<br />de la temporada.
              </h2>
            </div>
            <Link to="/catalog?featured=1" className="hidden md:inline-flex items-center gap-2 text-sm border-b border-foreground pb-0.5 hover:border-primary hover:text-primary transition-colors">
              Ver todos <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
            {featured.slice(0, 6).map((p, i) => (
              <Link key={p.id} to={`/product/${p.slug}`} className="group block">
                <div className="relative aspect-[4/5] bg-surface overflow-hidden mb-5">
                  {p.mainImageUrl && (
                    <img
                      src={p.mainImageUrl}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                    />
                  )}
                  <div className="absolute top-4 left-4 bg-background/95 backdrop-blur px-2 py-1 text-[10px] uppercase tracking-[0.2em] spec-num font-medium">
                    {String(i + 1).padStart(3, "0")}
                  </div>
                  {p.compareAtPrice && (
                    <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-2 py-1 text-[10px] uppercase tracking-[0.2em] font-medium">
                      Oferta
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="eyebrow mb-1.5">{p.category?.name}</div>
                    <h3 className="font-serif text-xl font-normal tracking-tight leading-tight group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="spec-num font-medium">{formatPYG(p.price)}</div>
                    {p.compareAtPrice && (
                      <div className="spec-num text-xs text-foreground/40 line-through">
                        {formatPYG(p.compareAtPrice)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY — editorial pillars */}
      <section id="por-que" className="border-b border-foreground/10">
        <div className="container py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <div className="eyebrow mb-4">— Filosofía</div>
              <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight text-balance leading-[1.05]">
                Ingeniería de precisión, sin compromisos.
              </h2>
              <p className="mt-6 text-foreground/65 leading-relaxed max-w-md">
                Cada sistema es seleccionado, especificado y respaldado por ingenieros.
                No vendemos productos: entregamos infraestructura.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-px bg-foreground/10 border border-foreground/10">
              {[
                { n: "01", title: "Eficiencia tier-1", desc: "Componentes seleccionados por rendimiento sostenido a 25+ años." },
                { n: "02", title: "Garantía extendida", desc: "Hasta 25 años en generación, 10 en almacenamiento." },
                { n: "03", title: "Tecnología avanzada", desc: "Topologías modernas con monitoreo en tiempo real." },
                { n: "04", title: "Soporte directo", desc: "Atención humana por WhatsApp, antes y después." },
              ].map((it) => (
                <div key={it.n} className="bg-background p-7 lg:p-8">
                  <div className="eyebrow spec-num mb-5">{it.n}</div>
                  <h3 className="font-serif text-xl font-normal tracking-tight mb-2">{it.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA — minimal */}
      <section>
        <div className="container py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <div className="eyebrow mb-4">— Cierre asistido</div>
              <h2 className="font-serif text-4xl md:text-6xl font-normal tracking-tight leading-[1.02] text-balance">
                Cierre directo por WhatsApp.<br />
                <span className="text-foreground/40">Sin fricciones.</span>
              </h2>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4">
              <p className="text-foreground/65 leading-relaxed">
                Cargá tu pedido, completás tus datos. Un asesor te acompaña por WhatsApp para confirmar disponibilidad, pago y entrega.
              </p>
              <Link
                to="/catalog"
                className="inline-flex items-center justify-between gap-2 bg-primary text-primary-foreground px-7 py-4 text-sm font-medium rounded-full hover:bg-primary-deep transition-colors group w-full"
              >
                <span>Empezar pedido</span>
                <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
