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
 * El probe es barato (HEAD request) y NO se cachea entre operaciones a
 * propósito: el caché top-level del módulo sobrevive a HMR de Vite y
 * puede mantener un estado obsoleto si el schema cambia.
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
  const m = error.message ?? "";
  return /could not find .*column/i.test(m);
}

export function isMissingColumnError(err: unknown, columns: readonly string[]): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const m = (e.message ?? "").toLowerCase();
  if (e.code !== "PGRST204" && !/could not find .*column/i.test(e.message ?? "")) return false;
  return columns.some((c) => m.includes(c));
}

async function probeColumnExists(name: string): Promise<boolean> {
  const probe = await supabase.from("products").select(name, { head: true, count: "exact" }).limit(1);
  return !isUnknownColumnPostgrestError(probe.error);
}

/**
 * Detecta soporte de columnas para una operación. Hace 6 HEAD requests en paralelo
 * (~150ms total). Pensado para llamarse 1 vez por operación, sin cache top-level
 * para evitar problemas de HMR/desincronización con el schema cache de PostgREST.
 */
export async function detectProductsSchemaSupport(): Promise<ProductsSchemaSupport> {
  const [compareAt, comparePrice, featured, isFeatured, heroSlideOrder, gallery] =
    await Promise.all([
      probeColumnExists("compare_at_price"),
      probeColumnExists("compare_price"),
      probeColumnExists("featured"),
      probeColumnExists("is_featured"),
      probeColumnExists("hero_slide_order"),
      probeColumnExists("gallery"),
    ]);
  const support: ProductsSchemaSupport = {
    compareAt,
    comparePrice,
    featured,
    isFeatured,
    heroSlideOrder,
    gallery,
  };
  if (typeof window !== "undefined") {
    const supportedNames = (Object.entries(support) as [keyof ProductsSchemaSupport, boolean][])
      .filter(([, ok]) => ok)
      .map(([k]) => k);
    console.debug("[Enertech] products schema support →", supportedNames.join(", ") || "(ninguna)");
  }
  return support;
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
