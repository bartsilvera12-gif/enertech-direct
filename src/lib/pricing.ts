/**
 * Descuento derivado de precio actual vs precio anterior (compare).
 * No persiste en BD; debe coincidir en admin y tienda.
 */
export function deriveDiscountPercent(
  price: number,
  compareAtPrice: number | null | undefined,
): number | null {
  if (compareAtPrice == null || !Number.isFinite(compareAtPrice) || compareAtPrice <= 0) return null;
  if (!Number.isFinite(price) || price < 0) return null;
  if (compareAtPrice <= price) return null;
  const pct = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return pct > 0 ? pct : null;
}
