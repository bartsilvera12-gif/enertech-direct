import type { Category } from "@/types";

/** Reglas: solo 2 niveles — raíz (`parent_id` null) y subcategoría (`parent_id` → raíz). */

export function sortCategoriesForUi(a: Category, b: Category): number {
  const ao = a.sortOrder ?? 0;
  const bo = b.sortOrder ?? 0;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name, "es");
}

/** Categorías principales ordenadas (sin padre). */
export function rootCategoriesSorted(all: Category[]): Category[] {
  return all.filter((c) => !c.parentId).sort(sortCategoriesForUi);
}

/** Subcategorías directas de una categoría principal por id. */
export function directSubcategoriesOfRoot(all: Category[], rootId: string): Category[] {
  return all.filter((c) => c.parentId === rootId).sort(sortCategoriesForUi);
}

/** Igual que la API pública del catálogo: hijos directos de una raíz identificada por slug. */
export function childrenOfParentSlug(all: Category[], rootSlug: string): Category[] {
  const root = all.find((c) => c.slug === rootSlug && !c.parentId);
  if (!root) return [];
  return directSubcategoriesOfRoot(all, root.id);
}

export function isRootCategory(c: Category): boolean {
  return !c.parentId;
}

/** `parentId` existe en `all` y es una categoría raíz (no una sub). */
export function isValidParentIdForSubcategory(all: Category[], parentId: string | null | undefined): boolean {
  if (parentId == null || parentId === "") return false;
  const p = all.find((x) => x.id === parentId);
  return Boolean(p && !p.parentId);
}

/**
 * Normaliza selección producto ↔ categorías si los datos están inconsistentes:
 * - si `category_id` apuntaba a una fila sub (tiene padre), pasa ese id a sub y sube el padre como categoría principal;
 * - si la sub no pertenece a la categoría principal elegida, se limpia.
 */
export function normalizeProductCategoryFields(
  all: Category[],
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
): { categoryId: string; subcategoryId: string | null } {
  let cat = categoryId ?? "";
  let sub = subcategoryId ?? null;

  const catRow = cat ? all.find((x) => x.id === cat) : undefined;
  if (catRow?.parentId) {
    sub = cat;
    cat = catRow.parentId;
  }

  if (sub) {
    const subRow = all.find((x) => x.id === sub);
    if (!subRow?.parentId || subRow.parentId !== cat) {
      sub = null;
    }
  }

  return { categoryId: cat, subcategoryId: sub };
}
