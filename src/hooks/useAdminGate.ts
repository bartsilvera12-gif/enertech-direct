import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AdminGateState = { loading: boolean; ok: boolean };

export function useAdminGate(): AdminGateState {
  const [state, setState] = useState<AdminGateState>({ loading: true, ok: false });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({ loading: false, ok: false });
      return;
    }

    let cancelled = false;

    async function verify() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        if (!cancelled) setState({ loading: false, ok: false });
        return;
      }
      const { data, error } = await supabase
        .from("admin_profiles")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) {
        if (!cancelled) setState({ loading: false, ok: false });
        return;
      }
      if (!cancelled) setState({ loading: false, ok: !!data });
    }

    verify();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      verify();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
