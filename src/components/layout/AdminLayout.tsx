import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Menu, Package, Store, X, LogOut, FolderTree, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

/** Mismo isotipo que el header de la tienda. */
const ADMIN_BRAND_ISOTYPE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776878281/WhatsApp_Image_2026-04-20_at_12.37.03_PM_qvvqam.png";

const adminLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Productos", href: "/admin/productos", icon: Package },
  { label: "Categorías", href: "/admin/categorias", icon: FolderTree },
  { label: "Importar Excel", href: "/admin/importar", icon: Upload },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background text-foreground flex">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-screen overflow-hidden",
          "bg-strategic text-strategic-foreground border-r border-white/15",
          "transform transition-transform duration-300 ease-out shadow-[4px_0_24px_-8px_rgba(0,0,0,0.15)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Patrón sutil (misma línea visual que hero/footer) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                -18deg,
                transparent 0,
                transparent 40px,
                hsl(0 0% 100% / 0.08) 40px,
                hsl(0 0% 100% / 0.08) 41px
              )
            `,
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/[0.08] via-transparent to-black/[0.12] pointer-events-none" aria-hidden />

        <div className="relative flex items-center justify-between h-16 px-5 border-b border-white/15">
          <Link to="/admin" className="flex items-center gap-3 min-w-0 group">
            <img
              src={ADMIN_BRAND_ISOTYPE_URL}
              alt="Enertech"
              className="h-11 w-11 object-contain shrink-0 drop-shadow-md"
              width={44}
              height={44}
              decoding="async"
            />
            <div className="min-w-0 text-left leading-tight">
              <span className="block font-semibold tracking-tight text-primary-glow drop-shadow-sm truncate">Enertech</span>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-white/60">Administración</span>
            </div>
          </Link>
          <button type="button" className="lg:hidden p-1.5 rounded-md hover:bg-white/10" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>

        <nav className="relative flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
          {adminLinks.map((link) => {
            const active =
              link.href === "/admin"
                ? location.pathname === "/admin"
                : location.pathname === link.href || location.pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-black/20"
                    : "text-white/88 hover:text-white hover:bg-white/10",
                )}
              >
                <link.icon className="size-[18px] shrink-0 opacity-95" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative p-3 border-t border-white/15 bg-black/10">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl text-white/88 hover:text-white hover:bg-white/10"
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-[18px]" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full lg:ml-64 lg:min-h-0 lg:h-full lg:overflow-hidden surface-mesh">
        <header className="sticky top-0 z-30 shrink-0 h-16 border-b border-border/40 bg-background/95 backdrop-blur-md flex items-center px-4 sm:px-6 gap-4 shadow-soft">
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded-lg border border-border/60 bg-card p-2 hover:bg-muted/50 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-[22px] text-foreground" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Panel</span>
            <span className="text-xs text-muted-foreground truncate">enertech · catálogo y stock</span>
          </div>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground hover:border-primary/35 hover:bg-primary/[0.06] transition-colors"
          >
            <Store className="size-4 text-primary shrink-0" />
            Ver tienda
          </Link>
        </header>
        <main className="flex-1 min-h-0 p-6 lg:p-10 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-40 lg:hidden border-0 cursor-default"
          aria-label="Cerrar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  );
}
