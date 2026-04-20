import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, Headphones, Globe, Package, Home as HomeIcon, Box } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import logoOriginal from "@/assets/enertech-logo-original.png";

const Home = () => {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: allProducts = [] } = useQuery({ queryKey: ["products", "all"], queryFn: () => fetchProducts() });
  const { data: featured = [] } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featuredOnly: true }),
  });

  // Group up to 4 products per category for the per-category sections
  const productsByCategory = categories
    .map((c) => ({
      category: c,
      products: allProducts.filter((p) => p.categoryId === c.id).slice(0, 4),
    }))
    .filter((g) => g.products.length > 0);

  return (
    <>
      {/* HERO — full-bleed brand image with logo + CTA */}
      <section className="relative bg-gradient-to-br from-primary via-primary-deep to-foreground text-primary-foreground overflow-hidden">
        {/* Decorative tech grid */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary-foreground/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 size-[500px] rounded-full bg-primary-foreground/5 blur-3xl pointer-events-none" />

        <div className="container relative py-16 md:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <img src={logoOriginal} alt="Enertech" className="h-20 md:h-24 w-auto rounded-2xl mx-auto lg:mx-0 mb-8 shadow-elevated" />
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-balance">
                Distribuidora de energía<br />
                <span className="text-background/80">de alto rendimiento</span>
              </h1>
              <p className="mt-6 text-lg text-primary-foreground/85 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Accedé a sistemas de generación, almacenamiento e insumos premium con la confianza y tecnología de Enertech.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 bg-background text-foreground px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-primary-foreground/90 transition-all shadow-elevated group"
                >
                  Explorar catálogo
                  <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="https://wa.me/595981000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-background/30 text-background px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-background/10 transition-all"
                >
                  Hablar por WhatsApp
                </a>
              </div>
            </div>
            <div className="hidden lg:flex relative aspect-[4/3] items-center justify-center">
              <div className="absolute inset-0 grid grid-cols-2 gap-4">
                {featured.slice(0, 4).map((p) => (
                  <div key={p.id} className="bg-background/10 backdrop-blur rounded-2xl overflow-hidden border border-background/15 hover:border-background/40 transition-all">
                    {p.mainImageUrl && <img src={p.mainImageUrl} alt={p.name} className="w-full h-full object-cover opacity-90" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-foreground/10 bg-surface">
        <div className="container py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Truck, label: "Envío seguro", desc: "A todo el país" },
            { icon: ShieldCheck, label: "Garantía", desc: "Hasta 25 años" },
            { icon: Headphones, label: "Soporte 24/7", desc: "WhatsApp directo" },
            { icon: Globe, label: "Stock real", desc: "Disponibilidad inmediata" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">{label}</div>
                <div className="text-xs text-foreground/55">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MÁS VIRALES / FEATURED */}
      <section className="container py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">Tendencias del momento</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Los más solicitados</h2>
          </div>
          <Link to="/catalog?featured=1" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {featured.slice(0, 4).map((p) => (
            <ProductCardPremium key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* PRODUCTS DESTACADOS — broader pick */}
      <section className="bg-surface border-y border-foreground/10">
        <div className="container py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">Catálogo</div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Productos destacados</h2>
            </div>
            <Link to="/catalog" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {allProducts.slice(0, 8).map((p) => (
              <ProductCardPremium key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* PER-CATEGORY SECTIONS */}
      {productsByCategory.map((group) => (
        <section key={group.category.id} className="container py-16 border-b border-foreground/10 last:border-0">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-2">Categoría</div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{group.category.name}</h2>
              {group.category.description && (
                <p className="text-sm text-foreground/60 mt-2 max-w-md">{group.category.description}</p>
              )}
            </div>
            <Link
              to={`/catalog?cat=${group.category.slug}`}
              className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all"
            >
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {group.products.map((p) => (
              <ProductCardPremium key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}

      {/* PROMESA / WHY */}
      <section id="por-que" className="bg-foreground text-background">
        <div className="container py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary-glow font-semibold mb-3">Nuestra promesa</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">¿Por qué Enertech?</h2>
            <p className="mt-4 text-background/70 leading-relaxed">
              Confianza, tecnología y soporte que respaldan cada compra.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: "Entrega inmediata", desc: "Stock real, despacho rápido a todo el país." },
              { icon: ShieldCheck, title: "100% Seguro", desc: "Productos verificados, garantías oficiales." },
              { icon: Globe, title: "Cobertura total", desc: "Asunción y todo el interior, sin excepciones." },
              { icon: Headphones, title: "Soporte dedicado", desc: "Atención profesional antes y después de comprar." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-background/5 border border-background/10 p-6 hover:border-primary/40 hover:bg-background/10 transition-all">
                <div className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-5">
                  <Icon className="size-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm text-background/65 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESO */}
      <section id="proceso" className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary font-semibold mb-3">Cómo trabajamos</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">Nuestro proceso</h2>
          <p className="mt-4 text-foreground/65 leading-relaxed">
            Rápido, sencillo y directo a la puerta de tu casa.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: "01", icon: Box, title: "Hacé tu pedido en la web", desc: "Cargás los productos y tus datos en minutos." },
            { n: "02", icon: Package, title: "Lo preparamos en el depósito", desc: "Verificamos stock y embalamos con cuidado." },
            { n: "03", icon: HomeIcon, title: "¡Lo recibís en tu casa!", desc: "Coordinamos la entrega contigo por WhatsApp." },
          ].map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="relative rounded-2xl bg-surface border border-foreground/10 p-8 hover:border-primary/40 transition-all">
              <div className="absolute -top-4 -left-4 size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold spec-num shadow-elevated">
                {n}
              </div>
              <div className="size-14 rounded-xl bg-background border border-foreground/10 flex items-center justify-center text-primary mb-5">
                <Icon className="size-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className="text-sm text-foreground/65 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-deep p-10 md:p-14 text-primary-foreground text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-80 rounded-full bg-background/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
              ¿Listo para empezar?
            </h2>
            <p className="mt-4 text-primary-foreground/85 max-w-xl mx-auto">
              Hablá con un asesor por WhatsApp o explorá nuestro catálogo completo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/catalog" className="inline-flex items-center gap-2 bg-background text-foreground px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-background/90 transition-colors">
                Ver catálogo
              </Link>
              <a
                href="https://wa.me/595981000000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-[#1ebe5a] transition-colors"
              >
                Hablar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
