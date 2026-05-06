import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Package, Truck, Headphones } from "lucide-react";
import { fetchProducts } from "@/services/storeService";
import { ProductCardPremium } from "@/components/store/ProductCardPremium";
import { HomeHero } from "@/components/home/HomeHero";
import type { BrandLogoItem } from "@/components/home/BrandsMarquee";
import { BrandsMarquee } from "@/components/home/BrandsMarquee";
import { UpsTechnicalServiceSection } from "@/components/home/UpsTechnicalServiceSection";

const BRAND_LOGOS: BrandLogoItem[] = [
  { src: "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880417/11251b4a-3374-4004-8324-67bd2f6d6862.png", alt: "HP" },
  { src: "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880445/64c472b7-09e5-4940-9a19-12b53681c232.png", alt: "Samsung" },
  { src: "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880495/e3082295-13ae-4a1f-bfa1-baf906a43573.png", alt: "Brother" },
  { src: "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776952642/27ca76f9-0610-43d2-b045-029f64362638.png", alt: "Epson" },
  { src: "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776953399/5a835952-42e4-4846-9ded-6b7060efe9ac.png", alt: "SATE" },
  { src: "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776953396/ea686df1-13f3-448e-9d30-a0c5a84d5fef.png", alt: "Acer" },
];

const Home = () => {
  const {
    data: featured = [],
    isError: featuredError,
    error: featuredErrorDetail,
  } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featuredOnly: true, sort: "newest" }),
  });

  const catalogErrorMessage =
    featuredErrorDetail instanceof Error ? featuredErrorDetail.message : String(featuredErrorDetail ?? "");

  return (
    <>
      <HomeHero />

      {featuredError ? (
        <div className="container max-w-3xl pt-6">
          <div
            role="alert"
            className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <p className="font-semibold">No se pudo cargar el catálogo desde Supabase</p>
            <p className="mt-1 opacity-90 break-words">{catalogErrorMessage || "Error desconocido"}</p>
          </div>
        </div>
      ) : null}

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

      <section className="py-16 md:py-24 border-b border-border/50 bg-background">
        <div className="container text-center max-w-4xl mx-auto mb-14 md:mb-16">
          <p className="text-base sm:text-lg md:text-xl uppercase tracking-[0.28em] text-primary font-bold mb-4 md:mb-5">
            Marcas
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Representaciones y partners
          </h2>
        </div>
        <BrandsMarquee brands={BRAND_LOGOS} />
      </section>

      <UpsTechnicalServiceSection />

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
