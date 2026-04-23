import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
import { mapCategory, type CategoryRow } from "@/lib/mapEnertech";
import { slugify } from "@/lib/slug";
import type { Category } from "@/types";

async function ensureUniqueSlug(base: string): Promise<string> {
  assertSupabaseConfigured();
  let slug = base || "categoria";
  let n = 0;
  for (;;) {
    const trySlug = n === 0 ? slug : `${slug}-${n}`;
    const { data } = await supabase.from("categories").select("id").eq("slug", trySlug).maybeSingle();
    if (!data) return trySlug;
    n += 1;
    if (n > 80) throw new Error("No se pudo generar slug único para la categoría");
  }
}

async function assertParentIsRootForSub(parentId: string | null, selfId?: string): Promise<void> {
  if (parentId == null || parentId === "") return;
  if (selfId && parentId === selfId) {
    throw new Error("Una categoría no puede ser padre de sí misma.");
  }
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id")
    .eq("id", parentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La categoría padre no existe.");
  if (data.parent_id != null) {
    throw new Error("Solo puede elegir una categoría principal como padre de una subcategoría.");
  }
}

export async function fetchCategoriesAdmin(): Promise<Category[]> {
  assertSupabaseConfigured();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as CategoryRow[]).map(mapCategory);
}

export type CategoryUpsertInput = {
  name: string;
  parent_id?: string | null;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export async function createCategoryAdmin(input: CategoryUpsertInput): Promise<Category> {
  assertSupabaseConfigured();
  await assertParentIsRootForSub(input.parent_id ?? null);
  const slug = await ensureUniqueSlug(slugify(input.name));
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name.trim(),
      slug,
      parent_id: input.parent_id ?? null,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapCategory(data as CategoryRow);
}

export async function updateCategoryAdmin(id: string, patch: Partial<CategoryUpsertInput>): Promise<Category> {
  assertSupabaseConfigured();
  if (patch.parent_id !== undefined) {
    await assertParentIsRootForSub(patch.parent_id ?? null, id);
  }
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.parent_id !== undefined) row.parent_id = patch.parent_id;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.image_url !== undefined) row.image_url = patch.image_url;
  if (patch.sort_order !== undefined) row.sort_order = patch.sort_order;
  if (patch.is_active !== undefined) row.is_active = patch.is_active;

  const { data, error } = await supabase.from("categories").update(row).eq("id", id).select("*").single();
  if (error) throw error;
  return mapCategory(data as CategoryRow);
}

export async function deleteCategoryAdmin(id: string): Promise<void> {
  assertSupabaseConfigured();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
