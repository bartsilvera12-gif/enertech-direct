import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const BACKEND_URL = (import.meta.env.VITE_FASTRAX_BACKEND_URL?.trim() || "http://localhost:8787").replace(/\/+$/, "");

/**
 * Renderiza una imagen Fastrax (ope=3) pasando el JWT admin en el header.
 * El `<img src>` HTML no envía Authorization automáticamente, por eso bajamos
 * el binario con fetch y lo mostramos como blob URL local. Revoca el blob al
 * desmontar para no leak memoria.
 */
export function FastraxAuthedImage({
  sku,
  img = 1,
  alt,
  className,
}: {
  sku: string;
  img?: number;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    setState("loading");
    setSrc(null);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) setState("error");
          return;
        }
        const res = await fetch(
          `${BACKEND_URL}/api/admin/fastrax/products/${encodeURIComponent(sku)}/image/${img}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) {
          if (!cancelled) setState("error");
          return;
        }
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          return;
        }
        setSrc(createdUrl);
        setState("ok");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [sku, img]);

  const sizeCls = className ?? "size-10 object-contain rounded border border-border/40";

  if (state === "loading") {
    return (
      <div className={`${sizeCls} grid place-items-center bg-muted/30`}>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state === "error" || !src) {
    return (
      <div className={`${sizeCls} grid place-items-center text-muted-foreground`}>
        <ImageIcon className="size-4" />
      </div>
    );
  }
  return <img src={src} alt={alt || sku} className={sizeCls} loading="lazy" />;
}
