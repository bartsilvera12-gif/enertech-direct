import { useEffect } from "react";
import { Target, Eye } from "lucide-react";

const Nosotros = () => {
  useEffect(() => {
    document.title = "Nosotros — Enertech";
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(160_35%_12%)] via-[hsl(145_40%_18%)] to-background pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(hsl(0 0% 100% / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, hsl(0 0% 100% / 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="container py-14 md:py-20 max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-3">Empresa</p>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-8">Nosotros</h1>

        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-14 md:mb-16 max-w-3xl">
          Enertech es una empresa orientada a brindar soluciones tecnológicas e informáticas para empresas, comercios y
          usuarios que buscan productos confiables, soporte especializado y atención personalizada.
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <article className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-sm p-8 shadow-sm hover:shadow-elevated hover:border-primary/25 transition-all">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Target className="size-5" aria-hidden />
              </span>
              <h2 className="text-xl font-semibold tracking-tight">Misión</h2>
            </div>
            <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">
              Comercializar soluciones tecnológicas e informáticas de alta calidad, brindando a nuestros clientes productos
              confiables, atención personalizada y un servicio eficiente que responda a las exigencias del mercado y
              contribuya al desarrollo de sus actividades.
            </p>
          </article>

          <article className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-sm p-8 shadow-sm hover:shadow-elevated hover:border-primary/25 transition-all">
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Eye className="size-5" aria-hidden />
              </span>
              <h2 className="text-xl font-semibold tracking-tight">Visión</h2>
            </div>
            <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">
              Ser una empresa sólida y distinguida en el sector informático, reconocida por la excelencia de sus
              productos, la calidad de su servicio y su capacidad para generar confianza, innovación y valor agregado a
              cada cliente.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
};

export default Nosotros;
