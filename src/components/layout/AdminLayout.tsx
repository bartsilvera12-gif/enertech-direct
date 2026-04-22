import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Menu, Package, Store, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const adminLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Productos", href: "/admin/productos", icon: Package },
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
    <div className="min-h-screen bg-background text-foreground flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-muted/80 border-r border-border/15 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border/15">
          <Link to="/admin" className="font-sans text-sm font-semibold tracking-[0.18em] uppercase text-foreground">
            Enertech
          </Link>
          <button type="button" className="lg:hidden p-1" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 flex flex-col gap-1">
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-background text-foreground shadow-sm border border-border/10" : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/15 bg-muted/80">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => void handleLogout()}
          >
            <LogOut size={18} />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-16 border-b border-border/15 flex items-center px-6 gap-4 bg-muted/40">
          <button type="button" className="lg:hidden p-1" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Panel de administración</span>
          <Link to="/" className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Store size={14} />
            Ver tienda
          </Link>
        </header>
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <Outlet />
        </main>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 bg-background/60 z-40 lg:hidden border-0 cursor-default"
          aria-label="Cerrar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </div>
  );
}
