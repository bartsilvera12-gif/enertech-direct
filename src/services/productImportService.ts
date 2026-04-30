import * as XLSX from "xlsx";
import { supabase, assertSupabaseConfigured } from "@/lib/supabase";
import { slugify } from "@/lib/slug";
import type { ExcelCanonicalField } from "@/types";
import { PRODUCT_EMBED } from "@/services/catalogService";
import { replaceProductImages } from "@/services/adminProductService";
import { mapProduct, type ProductRow } from "@/lib/mapEnertech";
import type { Product } from "@/types";

/** Imagen por defecto para fichas si el Excel no trae fotografía (brief Enertech). */
export const DEFAULT_PRODUCT_CARD_IMAGE =
  "https://res.cloudinary.com/dfxz2hxgr/image/upload/v1776880618/ed87b586-7ad8-442b-aac0-5826742a33b1.png";

export const EXCEL_FIELD_LABELS: Record<ExcelCanonicalField, string> = {
  rango: "Rango",
  codigo: "Codigo",
  descripcion: "Descripcion",
  fecha: "Fecha",
  agrupacion: "Agrupacion",
  marca: "Marca",
  deposito: "Deposito",
  proveedor: "Proveedor",
  tipo_articulo: "Tipo de Articulo",
  situacion: "Situacion",
  precio: "Precio",
  stock: "Stock",
  imagen: "Imagen",
  destacado: "Destacado",
  precio_tachado: "Precio Tachado",
};

export type ColumnMapping = Partial<Record<ExcelCanonicalField, string>>;

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseExcelToObjects(file: ArrayBuffer): ParsedSheet {
  const wb = XLSX.read(file, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const sheet = wb.Sheets[first];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown;
  const rowsRaw = Array.isArray(matrix) ? matrix : [];
  if (rowsRaw.length === 0) return { headers: [], rows: [] };
  const headers = (rowsRaw[0] ?? []).map((h) => String(h ?? "").trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < rowsRaw.length; i++) {
    const line = rowsRaw[i] as (string | number | null)[];
    if (!line || line.every((c) => c === "" || c == null)) continue;
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      const cell = line[idx];
      obj[header] = cell === null || cell === undefined ? "" : String(cell).trim();
    });
    rows.push(obj);
  }
  return { headers, rows };
}

function cell(row: Record<string, string>, headerName: string | undefined): string {
  if (!headerName) return "";
  return row[headerName]?.trim() ?? "";
}

function parseSituacionToActive(raw: string): boolean {
  const s = raw.toLowerCase().trim();
  if (!s) return true;
  if (/inactiv|baja|no\s*disp|agot|x\b|n\/a/.test(s)) return false;
  if (/activ|disp|stock|ok|si|sí|normal|vig/.test(s)) return true;
  return true;
}

/** Precio en Guaraníes: entero ≥ 0; admite separadores de miles. */
function parsePriceGs(raw: string): number {
  const n = parseMoneyInt(raw);
  return n != null && n >= 0 ? n : 0;
}

function parseMoneyInt(raw: string): number | null {
  const t = String(raw ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!t) return null;
  const normalized = t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t.replace(/\./g, "");
  const x = Number(normalized);
  if (!Number.isFinite(x)) return null;
  return Math.max(0, Math.round(x));
}

function parseStock(raw: string): number {
  const n = parseMoneyInt(raw);
  return n != null ? Math.max(0, Math.round(n)) : 0;
}

/** Si, sí, true, 1, destacado (case insensitive); vacío o no → false. */
function parseDestacado(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (!s) return false;
  if (/^(no|0|false|n)$/i.test(s)) return false;
  return /^(1|sí|si|true|yes|destacado|\*|ok)$/i.test(s);
}

/** Solo URLs http(s) públicas. */
function normalizePublicImageUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : null;
}

async function findOrCreateCategory(name: string, parentId: string | null): Promise<string> {
  assertSupabaseConfigured();
  const n = name.trim();
  if (!n) throw new Error("Nombre de categoría vacío");
  if (parentId) {
    const { data: parentRow, error: pe } = await supabase
      .from("categories")
      .select("parent_id")
      .eq("id", parentId)
      .maybeSingle();
    if (pe) throw pe;
    if (!parentRow) throw new Error(`Categoría padre no encontrada para "${n}".`);
    if (parentRow.parent_id != null) {
      throw new Error(`No se puede crear "${n}" bajo una subcategoría: solo dos niveles (principal → sub).`);
    }
  }
  const slugBase = slugify(n) || "categoria";
  const { data: cats } = await supabase.from("categories").select("id,name,parent_id");
  const hit = cats?.find(
    (row: { id: string; name: string; parent_id: string | null }) =>
      row.name.trim().toLowerCase() === n.toLowerCase() &&
      (parentId === null ? row.parent_id == null : row.parent_id === parentId),
  );
  if (hit) return hit.id;

  let slug = slugBase;
  for (let i = 0; i < 90; i++) {
    const trySlug = i === 0 ? slug : `${slugBase}-${i}`;
    const { data: clash } = await supabase.from("categories").select("id").eq("slug", trySlug).maybeSingle();
    if (!clash) {
      slug = trySlug;
      break;
    }
  }
  const { data: ins, error } = await supabase
    .from("categories")
    .insert({
      name: n,
      slug,
      parent_id: parentId,
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (error) throw error;
  return ins!.id as string;
}

async function ensureUniqueProductSlug(base: string): Promise<string> {
  assertSupabaseConfigured();
  let slug = base || "producto";
  for (let i = 0; i < 90; i++) {
    const trySlug = i === 0 ? slug : `${base}-${i}`;
    const { data } = await supabase.from("products").select("id").eq("slug", trySlug).maybeSingle();
    if (!data) return trySlug;
  }
  throw new Error("No se pudo generar slug único");
}

export type ImportResult = { created: number; updated: number; errors: string[] };

export async function importProductsFromExcel(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Promise<ImportResult> {
  assertSupabaseConfigured();
  const result: ImportResult = { created: 0, updated: 0, errors: [] };

  const h = (f: ExcelCanonicalField) => mapping[f];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const codigo = cell(row, h("codigo"));
    const descripcion = cell(row, h("descripcion"));
    if (!codigo || !descripcion) {
      result.errors.push(`Fila ${i + 2}: falta Codigo o Descripcion`);
      continue;
    }

    try {
      const agrupacion = cell(row, h("agrupacion"));
      const tipoArticulo = cell(row, h("tipo_articulo"));
      const marca = cell(row, h("marca"));
      const deposito = cell(row, h("deposito"));
      const proveedor = cell(row, h("proveedor"));
      const situacion = cell(row, h("situacion"));
      const rango = cell(row, h("rango"));
      const fecha = cell(row, h("fecha"));
      const precioRaw = cell(row, h("precio"));
      const stockRaw = cell(row, h("stock"));
      const imagenRaw = cell(row, h("imagen"));
      const destacadoRaw = cell(row, h("destacado"));
      const precioTachadoRaw = cell(row, h("precio_tachado"));

      const priceGs = parsePriceGs(precioRaw);
      const stockVal = parseStock(stockRaw);
      const compareFromExcel = parseMoneyInt(precioTachadoRaw);
      const compareRounded = compareFromExcel != null ? compareFromExcel : null;
      const featuredVal = parseDestacado(destacadoRaw);
      const imageUrl = normalizePublicImageUrl(imagenRaw);
      const imagenMapped = Boolean(h("imagen"));
      const galleryUrls = imageUrl ? [imageUrl] : [DEFAULT_PRODUCT_CARD_IMAGE];

      let categoryId: string | null = null;
      let subcategoryId: string | null = null;

      if (agrupacion) {
        categoryId = await findOrCreateCategory(agrupacion, null);
      }
      if (tipoArticulo && categoryId) {
        subcategoryId = await findOrCreateCategory(tipoArticulo, categoryId);
      } else if (tipoArticulo && !categoryId) {
        categoryId = await findOrCreateCategory(tipoArticulo, null);
      }

      const isActive = parseSituacionToActive(situacion);
      const slugBase = `${slugify(descripcion)}-${slugify(codigo)}`.slice(0, 120);
      const slug = await ensureUniqueProductSlug(slugBase);

      const specs: Record<string, string> = {};
      if (rango) specs.rango = rango;
      if (fecha) specs.fecha = fecha;

      const payload = {
        code: codigo,
        sku: codigo,
        name: descripcion,
        slug,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        brand: marca || null,
        warehouse: deposito || null,
        supplier: proveedor || null,
        article_type: tipoArticulo || null,
        situation: situacion || null,
        range_label: rango || null,
        short_description: null as string | null,
        description: descripcion,
        price: priceGs,
        stock: stockVal,
        image_url: imageUrl,
        gallery: galleryUrls,
        compare_at_price: compareRounded,
        compare_price: compareRounded,
        track_stock: true,
        featured: featuredVal,
        is_featured: featuredVal,
        is_active: isActive,
        specs,
      };

      const { data: existing } = await supabase.from("products").select("id").eq("code", codigo).maybeSingle();

      if (existing?.id) {
        const updateRow: Record<string, unknown> = {
          name: payload.name,
          category_id: payload.category_id,
          subcategory_id: payload.subcategory_id,
          brand: payload.brand,
          warehouse: payload.warehouse,
          supplier: payload.supplier,
          article_type: payload.article_type,
          situation: payload.situation,
          range_label: payload.range_label,
          description: payload.description,
          price: payload.price,
          stock: payload.stock,
          compare_at_price: compareRounded,
          compare_price: compareRounded,
          featured: featuredVal,
          is_featured: featuredVal,
          is_active: payload.is_active,
          specs: payload.specs,
          updated_at: new Date().toISOString(),
        };
        if (imagenMapped) {
          updateRow.image_url = imageUrl;
        }
        const { error } = await supabase.from("products").update(updateRow).eq("id", existing.id);
        if (error) throw error;
        if (imagenMapped) {
          await replaceProductImages(existing.id, imageUrl ? [imageUrl] : [DEFAULT_PRODUCT_CARD_IMAGE]);
        }
        result.updated += 1;
      } else {
        const { data: ins, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        const pid = ins!.id as string;
        await replaceProductImages(pid, galleryUrls);
        result.created += 1;
      }
    } catch (e) {
      result.errors.push(`Fila ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

/** Tipado útil para UI admin */
export async function fetchSampleProduct(id: string): Promise<Product | null> {
  assertSupabaseConfigured();
  const { data } = await supabase.from("products").select(PRODUCT_EMBED).eq("id", id).maybeSingle();
  if (!data) return null;
  return mapProduct(data as ProductRow);
}
