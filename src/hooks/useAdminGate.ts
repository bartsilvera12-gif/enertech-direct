import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AdminGateState = { loading: boolean; ok: boolean };

/**
 * Caché de "¿este usuario es admin?" por user_id, a nivel de módulo.
 * Evita reconsultar `admin_profiles` en cada refresh de token / cambio de foco
 * y mantiene el resultado estable entre el login y la ruta protegida.
 */
const adminCache = new Map<string, boolean>();

async function resolveAdmin(userId: string): Promise<boolean> {
  const cached = adminCache.get(userId);
  if (cached !== undefined) return cached;

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  // En caso de error transitorio no cacheamos: que pueda reintentar luego.
  if (error) return false;

  const ok = !!data;
  adminCache.set(userId, ok);
  return ok;
}

export function useAdminGate(): AdminGateState {
  const [state, setState] = useState<AdminGateState>({ loading: true, ok: false });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({ loading: false, ok: false });
      return;
    }

    let cancelled = false;

    // Resuelve el acceso a partir de una sesión ya obtenida (sin volver a llamar
    // a getSession dentro de callbacks de auth). Nunca reactiva el spinner: el
    // único `loading:true` es el estado inicial, antes de la primera resolución.
    async function applySession(session: Session | null) {
      const userId = session?.user?.id;
      if (!userId) {
        if (!cancelled) setState({ loading: false, ok: false });
        return;
      }

      // Si ya sabemos el resultado, lo aplicamos sin parpadeo ni consulta extra.
      const cached = adminCache.get(userId);
      if (cached !== undefined) {
        if (!cancelled) setState({ loading: false, ok: cached });
        return;
      }

      // Sin caché: el estado inicial ya está en loading:true, así que el spinner
      // se mantiene hasta resolver; las re-verificaciones de fondo no lo tocan.
      const ok = await resolveAdmin(userId);
      if (!cancelled) setState({ loading: false, ok });
    }

    // Verificación inicial (fuera de cualquier callback de auth).
    supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // El cierre de sesión sí debe cortar el acceso de inmediato.
      if (event === "SIGNED_OUT") {
        if (!cancelled) setState({ loading: false, ok: false });
        return;
      }
      // El resto de eventos (TOKEN_REFRESHED, SIGNED_IN, USER_UPDATED…) se
      // re-validan en segundo plano usando la sesión del propio evento, sin
      // volver a mostrar "Verificando acceso…".
      void applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
