import { supabase } from "@/lib/supabase";

/**
 * Detección de columnas en `enertech.products` para tolerar instancias
 * que difieren en nombres legacy:
 *   - precio tachado: `compare_at_price` (schema 01) vs `compare_price` (alineación 09/10)
 *   - destacado:      `featured`         (schema 01) vs `is_featured`  (alineación 09/10)
 *
 * Sin esta detección PostgREST devuelve PGRST204 al hacer INSERT/UPDATE
 * con columnas inexistentes, o al filtrar con `.or("featured.eq.true,...")`
 * cuando una de las columnas no está expuesta.
 *
 * Estrategia: 1 sola request `SELECT * LIMIT 1` y leemos las keys del row real.
 * Es 100% certero (refleja exactamente lo que PostgREST expone), más barato
 * que probes individuales y no genera 400s en consola.
 *
 * Cache por instancia del módulo (vive lo que vive el bundle JS). Si el schema
 * cambia, basta con un hard reload del navegador para refrescarlo.
 */
export type ProductsSchemaSupport = {
  compareAt: boolean;
  comparePrice: boolean;
  featured: boolean;
  isFeatured: boolean;
  heroSlideOrder: boolean;
  gallery: boolean;
};

export const COMPARE_COLUMNS = ["compare_at_price", "compare_price"] as const;
export const FEATURED_COLUMNS = ["featured", "is_featured"] as const;

export function isUnknownColumnPostgrestError(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  if (error.code === "PGRST204") return true;
  if (error.code === "42703") return true;
  const m = error.message ?? "";
  return /could not find .*column/i.test(m) || /column .* does not exist/i.test(m);
}

export function isMissingColumnError(err: unknown, columns: readonly string[]): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const m = (e.message ?? "").toLowerCase();
  if (
    e.code !== "PGRST204" &&
    e.code !== "42703" &&
    !/could not find .*column/i.test(e.message ?? "") &&
    !/column .* does not exist/i.test(e.message ?? "")
  ) {
    return false;
  }
  return columns.some((c) => m.includes(c));
}

/** Default conservador cuando no hay productos / falla la detección. */
const FALLBACK_SUPPORT: ProductsSchemaSupport = {
  compareAt: false,
  comparePrice: true,
  featured: false,
  isFeatured: true,
  heroSlideOrder: false,
  gallery: false,
};

let supportPromise: Promise<ProductsSchemaSupport> | null = null;

/** Resetea el cache (útil después de aplicar migraciones sin recargar la página). */
export function resetProductsSchemaSupportCache(): void {
  supportPromise = null;
}

async function detectProductsSchemaSupportImpl(): Promise<ProductsSchemaSupport> {
  const { data, error } = await supabase.from("products").select("*").limit(1);

  if (error) {
    console.warn(
      "[Enertech] No se pudo detectar el schema de products, usando fallback conservador.",
      error,
    );
    return FALLBACK_SUPPORT;
  }

  const row = (data && data[0]) as Record<string, unknown> | undefined;
  if (!row) {
    if (typeof window !== "undefined") {
      console.debug(
        "[Enertech] products vacío, schema support con fallback:",
        FALLBACK_SUPPORT,
      );
    }
    return FALLBACK_SUPPORT;
  }

  const cols = new Set(Object.keys(row));
  const support: ProductsSchemaSupport = {
    compareAt: cols.has("compare_at_price"),
    comparePrice: cols.has("compare_price"),
    featured: cols.has("featured"),
    isFeatured: cols.has("is_featured"),
    heroSlideOrder: cols.has("hero_slide_order"),
    gallery: cols.has("gallery"),
  };

  if (typeof window !== "undefined") {
    const supportedNames = (Object.entries(support) as [keyof ProductsSchemaSupport, boolean][])
      .filter(([, ok]) => ok)
      .map(([k]) => k);
    console.debug(
      "[Enertech] products schema support →",
      supportedNames.join(", ") || "(ninguna)",
    );
  }
  return support;
}

/**
 * Detecta soporte de columnas. Cacheado por instancia del módulo: 1 sola
 * request por sesión. Llamá `resetProductsSchemaSupportCache()` si
 * aplicaste migraciones y querés re-detectar sin recargar.
 */
export function detectProductsSchemaSupport(): Promise<ProductsSchemaSupport> {
  if (!supportPromise) {
    supportPromise = detectProductsSchemaSupportImpl().catch((e) => {
      supportPromise = null;
      throw e;
    });
  }
  return supportPromise;
}

export function stripFields(target: Record<string, unknown>, fields: readonly string[]): void {
  for (const f of fields) delete target[f];
}

/**
 * Construye el filtro OR para destacados según las columnas que existan.
 * Devuelve `null` si ninguna de las dos existe (no hay forma de filtrar destacados).
 */
export function buildFeaturedOrFilter(support: ProductsSchemaSupport): string | null {
  const parts: string[] = [];
  if (support.isFeatured) parts.push("is_featured.eq.true");
  if (support.featured) parts.push("featured.eq.true");
  if (parts.length === 0) return null;
  return parts.join(",");
}
