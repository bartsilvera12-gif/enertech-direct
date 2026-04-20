import logoOriginal from "@/assets/enertech-logo-original.png";
import { ArrowUpRight } from "lucide-react";

export const PremiumFooter = () => {
  return (
    <footer className="bg-foreground text-background mt-24">
      <div className="container pt-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
          <div className="lg:col-span-5">
            <img src={logoOriginal} alt="Enertech" className="h-11 w-auto rounded-lg mb-8" />
            <h3 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight leading-tight max-w-md text-balance">
              Energía e insumos para el futuro constante.
            </h3>
            <p className="mt-6 text-sm text-background/60 leading-relaxed max-w-md">
              Sistemas premium de generación, almacenamiento y conversión, respaldados por soporte experto.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-10">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-background/50 mb-5">Tienda</div>
              <ul className="space-y-3 text-sm">
                <li><a href="/catalog" className="hover:text-primary transition-colors inline-flex items-center gap-1 group">Catálogo <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
                <li><a href="/catalog?featured=1" className="hover:text-primary transition-colors">Destacados</a></li>
                <li><a href="/cart" className="hover:text-primary transition-colors">Carrito</a></li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-background/50 mb-5">Soporte</div>
              <ul className="space-y-3 text-sm">
                <li><span className="text-background/80">WhatsApp directo</span></li>
                <li><span className="text-background/80">Soporte técnico</span></li>
                <li><span className="text-background/80">Garantías</span></li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-background/50 mb-5">Contacto</div>
              <ul className="space-y-3 text-sm text-background/80">
                <li>+595 981 000 000</li>
                <li>hola@enertech.py</li>
                <li>Asunción, Paraguay</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-background/15 pt-6 flex flex-col md:flex-row gap-3 justify-between text-[11px] uppercase tracking-[0.2em] text-background/50">
          <span>© {new Date().getFullYear()} Enertech S.A.</span>
          <span>Hecho con precisión.</span>
        </div>
      </div>
    </footer>
  );
};
