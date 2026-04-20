import logoOriginal from "@/assets/enertech-logo-original.png";

export const PremiumFooter = () => {
  return (
    <footer className="border-t border-foreground/10 mt-32 surface-contrast">
      <div className="container py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-5">
            <img src={logoOriginal} alt="Enertech" className="h-12 w-auto rounded-xl" />
          </div>
          <p className="text-sm text-contrast-foreground/70 max-w-md leading-relaxed">
            Energía e insumos para el futuro constante. Sistemas premium de
            generación, almacenamiento y conversión, respaldados por soporte experto.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-accent mb-4">Tienda</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/catalog" className="text-contrast-foreground/80 hover:text-primary-glow transition-colors">Catálogo</a></li>
            <li><a href="/catalog?featured=1" className="text-contrast-foreground/80 hover:text-primary-glow transition-colors">Destacados</a></li>
            <li><a href="/cart" className="text-contrast-foreground/80 hover:text-primary-glow transition-colors">Carrito</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-accent mb-4">Soporte</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-contrast-foreground/70">WhatsApp directo</span></li>
            <li><span className="text-contrast-foreground/70">Soporte técnico</span></li>
            <li><span className="text-contrast-foreground/70">Garantías</span></li>
          </ul>
        </div>
      </div>
      <div className="container py-6 border-t border-contrast-foreground/10 flex flex-col md:flex-row gap-2 justify-between text-xs text-contrast-foreground/50">
        <span>© {new Date().getFullYear()} Enertech. Todos los derechos reservados.</span>
        <span>Hecho con precisión.</span>
      </div>
    </footer>
  );
};
