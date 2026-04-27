import { Link } from "react-router-dom";
import { ArrowUpRight, Linkedin, MapPin } from "lucide-react";
import { ENERTECH_BRAND_LOCKUP_URL } from "@/lib/brandAssets";

export const PremiumFooter = () => {
  return (
    <footer className="border-t border-white/10 bg-gradient-to-br from-[hsl(78_58%_26%)] via-[hsl(160_38%_18%)] to-[hsl(175_42%_14%)] text-white mt-auto">
      <div className="container py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5 space-y-6">
            <Link to="/" className="inline-block max-w-full" aria-label="Enertech — inicio">
              <img
                src={ENERTECH_BRAND_LOCKUP_URL}
                alt="Enertech — Energía e insumos"
                className="h-14 sm:h-16 md:h-[4.5rem] lg:h-20 w-auto max-w-[min(100%,320px)] object-contain object-left drop-shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                width={320}
                height={80}
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="text-base md:text-lg text-white/85 leading-relaxed max-w-md">
              Soluciones en informática, insumos de oficina e impresión para empresas en Paraguay. Representaciones HP, Brother,
              Samsung y más — consultá stock y precios por WhatsApp.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-10 lg:gap-12">
            <div>
              <div className="text-xs md:text-sm uppercase tracking-[0.18em] text-white/65 mb-5 font-semibold">Tienda</div>
              <ul className="space-y-4 text-base md:text-lg">
                <li>
                  <Link to="/catalog" className="hover:text-primary-glow transition-colors inline-flex items-center gap-1 group">
                    Catálogo <ArrowUpRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
                <li>
                  <Link to="/catalog?featured=1" className="hover:text-primary-glow transition-colors">
                    Destacados
                  </Link>
                </li>
                <li>
                  <Link to="/nosotros" className="hover:text-primary-glow transition-colors">
                    Nosotros
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-primary-glow transition-colors">
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs md:text-sm uppercase tracking-[0.18em] text-white/65 mb-5 font-semibold">Empresa</div>
              <ul className="space-y-4 text-base md:text-lg text-white/90">
                <li>Asunción, Paraguay</li>
                <li>
                  <a href="mailto:hola@enertech.py" className="hover:text-white underline-offset-4 hover:underline">
                    hola@enertech.py
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs md:text-sm uppercase tracking-[0.18em] text-white/65 mb-5 font-semibold">Redes</div>
              <div className="flex gap-3 mb-5">
                <a
                  href="https://linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 md:size-12 items-center justify-center rounded-full border border-white/25 bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="size-5 md:size-6" />
                </a>
                <a
                  href="https://wa.me/595971472716"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-11 md:size-12 items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#1ebe5a] transition-colors shadow-lg shadow-black/20"
                  aria-label="WhatsApp"
                >
                  <svg className="size-5 md:size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
              <a
                href="https://maps.app.goo.gl/51UiUXYHW1KkYynF8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 text-base md:text-lg text-white/90 hover:text-primary-glow transition-colors group"
              >
                <MapPin className="size-5 shrink-0 mt-0.5 opacity-90 group-hover:opacity-100" aria-hidden />
                <span className="leading-snug underline-offset-4 group-hover:underline">CDE - Paraguay</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-white/15">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-center text-sm md:text-base uppercase tracking-[0.14em] text-white/70">
            <span className="md:justify-self-start text-center md:text-left">© {new Date().getFullYear()} Enertech</span>
            <span className="justify-self-center text-center font-medium text-white/85 normal-case tracking-normal text-[0.9375rem] md:text-base">
              Desarrollado por Neura
            </span>
            <span className="md:justify-self-end text-center md:text-right text-white/55">Informática · Insumos · Paraguay</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
