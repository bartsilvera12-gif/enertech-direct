export const PremiumFooter = () => {
  return (
    <footer className="border-t border-white/5 mt-32">
      <div className="container py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-7 rounded-md bg-gradient-energy flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="font-semibold tracking-tight">ENERTECH</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Energía sintetizada para el futuro constante. Sistemas premium de
            generación, almacenamiento y conversión, respaldados por soporte experto.
          </p>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Tienda</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="/catalog" className="hover:text-primary transition-colors">Catálogo</a></li>
            <li><a href="/catalog?featured=1" className="hover:text-primary transition-colors">Destacados</a></li>
            <li><a href="/cart" className="hover:text-primary transition-colors">Carrito</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Soporte</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="text-muted-foreground">WhatsApp directo</span></li>
            <li><span className="text-muted-foreground">Soporte técnico</span></li>
            <li><span className="text-muted-foreground">Garantías</span></li>
          </ul>
        </div>
      </div>
      <div className="container py-6 border-t border-white/5 flex flex-col md:flex-row gap-2 justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Enertech. Todos los derechos reservados.</span>
        <span>Hecho con precisión.</span>
      </div>
    </footer>
  );
};
