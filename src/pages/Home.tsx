import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package, Truck, Headphones } from "lucide-react";
import { fetchCategories, fetchProducts, rootCategories } from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import { HomeHero } from "@/components/home/HomeHero";

const BRAND_LOGOS = [
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880417/11251b4a-3374-4004-8324-67bd2f6d6862.png",
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880445/64c472b7-09e5-4940-9a19-12b53681c232.png",
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880495/e3082295-13ae-4a1f-bfa1-baf906a43573.png",
];

const TILE_FALLBACK = [
  { title: "Impresoras", slug: "impresoras", desc: "HP, Brother, Samsung y más." },
  { title: "Insumos", slug: "insumos", desc: "Tóner, ribbon, refill y bobinas." },
  { title: "Computación", slug: "computacion", desc: "Equipos y periféricos." },
  { title: "Accesorios", slug: "accesorios", desc: "Cables, etiquetas y respaldo." },
];

const Home = () => {
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const roots = rootCategories(categories);

  const { data: featured = [] } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featuredOnly: true, sort: "newest" }),
  });

  const categoryTiles = TILE_FALLBACK.map((t) => {
    const match = roots.find((c) => c.slug === t.slug);
    return {
      ...t,
      href: match ? `/catalog?cat=${match.slug}` : `/catalog?q=${encodeURIComponent(t.title)}`,
    };
  });

  return (
    <>
      <HomeHero />

      <section id="categorias" className="scroll-mt-28 py-16 md:py-20 border-b border-border/50">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Catálogo</p>
              <h2 className="text-3xl font-semibold tracking-tight">Categorías principales</h2>
            </div>
            <Link to="/catalog" className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
              Ver todo <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categoryTiles.map((c) => (
              <Link
                key={c.slug}
                to={c.href}
                className="group rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-elevated hover:border-primary/30 transition-all"
              >
                <Package className="size-8 text-primary mb-5" />
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{c.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted/30 border-b border-border/50">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Destacados</p>
              <h2 className="text-3xl font-semibold tracking-tight">Productos destacados</h2>
            </div>
            <Link to="/catalog?featured=1" className="text-sm font-semibold text-primary inline-flex items-center gap-1">
              Ver selección <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(featured.length ? featured.slice(0, 8) : []).map((p) => (
              <ProductCardPremium key={p.id} product={p} />
            ))}
            {featured.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-12">
                Pronto cargaremos productos destacados.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 border-b border-border/50">
        <div className="container text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Marcas</p>
          <h2 className="text-3xl font-semibold tracking-tight">Representaciones y partners</h2>
        </div>
        <div className="container flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-90">
          {BRAND_LOGOS.map((src) => (
            <img key={src} src={src} alt="" className="h-12 md:h-14 w-auto object-contain grayscale hover:grayscale-0 transition-all duration-300" />
          ))}
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">Por qué Enertech</p>
            <h2 className="text-3xl font-semibold tracking-tight">Beneficios para tu empresa</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Truck, title: "Entrega rápida", desc: "Logística ágil a Asunción e interior." },
              { icon: Package, title: "Stock permanente", desc: "Rotación activa de insumos críticos." },
              { icon: Headphones, title: "Soporte técnico", desc: "Asesoramiento en equipos e impresión." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                  <Icon className="size-7" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
