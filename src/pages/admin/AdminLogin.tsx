import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAdminGate } from "@/hooks/useAdminGate";

const LOGIN_BRAND_ISOTYPE_URL =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776878281/WhatsApp_Image_2026-04-20_at_12.37.03_PM_qvvqam.png";

export default function AdminLogin() {
  const gate = useAdminGate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (gate.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background surface-mesh text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (gate.ok) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      toast.error(
        "Faltan variables de entorno en el build de producción. Configurá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Hostinger y ejecutá Redeploy.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const uid = data.user?.id;
      if (!uid) {
        toast.error("Sesión inválida");
        await supabase.auth.signOut();
        return;
      }
      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_profiles")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (adminErr) {
        toast.error(adminErr.message);
        await supabase.auth.signOut();
        return;
      }
      if (!adminRow) {
        toast.error("Este usuario no tiene perfil administrador en enertech.admin_profiles.");
        await supabase.auth.signOut();
        return;
      }
      navigate("/admin", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <section className="relative admin-sidebar-gradient text-white pt-10 pb-24 sm:pb-28 px-6 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                -18deg,
                transparent 0,
                transparent 38px,
                hsl(0 0% 100% / 0.06) 38px,
                hsl(0 0% 100% / 0.06) 39px
              )
            `,
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/[0.08] via-transparent to-black/[0.2] pointer-events-none" aria-hidden />
        <div className="relative z-10 max-w-lg mx-auto text-center">
          <img
            src={LOGIN_BRAND_ISOTYPE_URL}
            alt="Enertech"
            className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] object-contain mx-auto drop-shadow-lg"
            width={72}
            height={72}
            decoding="async"
          />
          <h1 className="mt-6 text-2xl sm:text-3xl font-semibold tracking-tight text-white text-balance">Panel de administración</h1>
          <p className="mt-3 text-sm text-emerald-100/85">
            <span className="font-semibold text-emerald-50">Enertech</span>
            <span className="text-emerald-100/75"> · Informática e insumos</span>
          </p>
        </div>
      </section>

      <div className="flex-1 flex justify-center px-4 sm:px-6 pb-12 sm:pb-16 -mt-14 sm:-mt-16 relative z-10 surface-mesh">
        <div className="w-full max-w-md rounded-2xl border border-border/50 bg-card shadow-elevated p-8 sm:p-10">
          {!isSupabaseConfigured() ? (
            <p className="text-sm text-destructive text-center mb-6 leading-relaxed">
              Faltan variables de entorno en el build de producción. Configurá VITE_SUPABASE_URL y
              VITE_SUPABASE_ANON_KEY en Hostinger y ejecutá Redeploy.
            </p>
          ) : null}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="bg-background border-border/80 focus-visible:ring-primary/30"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Contraseña</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-background border-border/80 focus-visible:ring-primary/30"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-xl shadow-md shadow-primary/20" size="lg" disabled={submitting}>
              {submitting ? "Entrando…" : "Iniciar sesión"}
            </Button>
          </form>
          <p className="text-center mt-8">
            <Link to="/" className="text-sm font-medium text-primary hover:underline underline-offset-4">
              Volver a la tienda
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
