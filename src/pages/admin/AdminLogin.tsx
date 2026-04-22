import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAdminGate } from "@/hooks/useAdminGate";

export default function AdminLogin() {
  const gate = useAdminGate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (gate.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
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
      toast.error("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY");
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
    <div className="min-h-screen bg-background flex items-center justify-center px-6 surface-mesh">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl tracking-[0.2em] font-light text-foreground mb-2">Enertech Direct</h1>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Panel de administración</p>
        </div>
        {!isSupabaseConfigured() ? (
          <p className="text-sm text-destructive text-center mb-6">
            Variables de entorno Supabase ausentes. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local
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
              className="bg-card"
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
              className="bg-card"
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={submitting || !isSupabaseConfigured()}>
            {submitting ? "Entrando…" : "Iniciar sesión"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed">
          Acceso con Supabase Auth. El usuario debe existir en <code className="text-foreground/80">admin_profiles</code>.
        </p>
      </div>
    </div>
  );
}
