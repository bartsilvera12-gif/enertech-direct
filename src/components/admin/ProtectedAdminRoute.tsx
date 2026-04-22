import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminGate } from "@/hooks/useAdminGate";

export function ProtectedAdminRoute() {
  const { loading, ok } = useAdminGate();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-sm">Verificando acceso…</span>
      </div>
    );
  }

  if (!ok) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
