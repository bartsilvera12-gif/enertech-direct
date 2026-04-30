import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, Product } from "@/types";
import { slugify } from "@/lib/slug";
import { createProductAdmin, updateProductAdmin, type ProductUpsertInput } from "@/services/adminProductService";
import { formatPostgrestError } from "@/lib/postgrestError";
import { directSubcategoriesOfRoot, normalizeProductCategoryFields } from "@/lib/categoryHierarchy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  product: Product | null;
  onSaved: () => void;
};

export function AdminProductDialog({ open, onOpenChange, categories, product, onSaved }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sku, setSku] = useState("");
  const [code, setCode] = useState("");
  const [brand, setBrand] = useState("");
  const [supplier, setSupplier] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [articleType, setArticleType] = useState("");
  const [situation, setSituation] = useState("");
  const [rangeLabel, setRangeLabel] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [compare, setCompare] = useState("");
  const [stock, setStock] = useState("");
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [heroSlideOrderStr, setHeroSlideOrderStr] = useState("");
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [saving, setSaving] = useState(false);

  const roots = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "es")),
    [categories],
  );

  const subcategoriesForSelection = useMemo(() => {
    if (!categoryId) return [];
    return directSubcategoriesOfRoot(categories, categoryId);
  }, [categories, categoryId]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      const norm = normalizeProductCategoryFields(categories, product.categoryId ?? "", product.subcategoryId ?? null);
      setName(product.name);
      setSlug(product.slug);
      setSku(product.sku ?? "");
      setCode(product.code ?? "");
      setBrand(product.brand ?? "");
      setSupplier(product.supplier ?? "");
      setWarehouse(product.warehouse ?? "");
      setArticleType(product.articleType ?? "");
      setSituation(product.situation ?? "");
      setRangeLabel(product.rangeLabel ?? "");
      setCategoryId(norm.categoryId);
      setSubcategoryId(norm.subcategoryId ?? "");
      setShortDesc(product.shortDescription ?? "");
      setDesc(product.description ?? "");
      setPrice(String(product.price));
      setCompare(product.compareAtPrice != null ? String(product.compareAtPrice) : "");
      setStock(String(product.stock));
      setFeatured(product.featured);
      setActive(product.isActive);
      setHeroSlideOrderStr(product.heroSlideOrder != null ? String(product.heroSlideOrder) : "");
      setPrimaryImageUrl(product.imageUrl?.trim() ?? "");
      setImagesText(product.gallery.join("\n"));
    } else {
      setName("");
      setSlug("");
      setSku("");
      setCode("");
      setBrand("");
      setSupplier("");
      setWarehouse("");
      setArticleType("");
      setSituation("");
      setRangeLabel("");
      setCategoryId(roots[0]?.id ?? "");
      setSubcategoryId("");
      setShortDesc("");
      setDesc("");
      setPrice("");
      setCompare("");
      setStock("0");
      setFeatured(false);
      setActive(true);
      setHeroSlideOrderStr("");
      setPrimaryImageUrl("");
      setImagesText("");
    }
  }, [open, product, categories, roots]);

  const applySlugFromName = () => {
    setSlug(slugify(name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const specs: Record<string, string> = product?.specs ?? {};
    const priceNum = Number(price);
    const stockNum = Number(stock);
    if (!name.trim() || !slug.trim()) {
      toast.error("Nombre y slug son obligatorios");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Precio inválido");
      return;
    }
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      toast.error("Stock inválido");
      return;
    }
    const compareNum = compare.trim() === "" ? null : Number(compare);
    if (compareNum != null && (!Number.isFinite(compareNum) || compareNum < 0)) {
      toast.error("Precio anterior inválido");
      return;
    }

    const subRow = subcategoryId ? categories.find((x) => x.id === subcategoryId) : null;
    if (subcategoryId && (!subRow || subRow.parentId !== categoryId)) {
      toast.error("La subcategoría debe pertenecer a la categoría principal elegida.");
      return;
    }
    if (categoryId) {
      const main = categories.find((x) => x.id === categoryId);
      if (main?.parentId) {
        toast.error("La categoría principal no puede ser una subcategoría.");
        return;
      }
    }

    let hero_slide_order: number | null = null;
    const ho = heroSlideOrderStr.trim();
    if (ho !== "") {
      const n = Number(ho);
      if (!Number.isFinite(n)) {
        toast.error("Orden en el slider del inicio debe ser un número");
        return;
      }
      hero_slide_order = Math.round(n);
    }

    const image_urls = imagesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload: ProductUpsertInput = {
      name,
      slug,
      sku: sku || null,
      code: code || null,
      brand: brand || null,
      supplier: supplier || null,
      warehouse: warehouse || null,
      article_type: articleType || null,
      situation: situation || null,
      range_label: rangeLabel.trim() || null,
      category_id: categoryId || null,
      subcategory_id: subcategoryId || null,
      short_description: shortDesc || null,
      description: desc || null,
      price: priceNum,
      compare_at_price: compareNum,
      stock: stockNum,
      featured,
      is_active: active,
      specs,
      image_url: primaryImageUrl.trim() || null,
      hero_slide_order,
      image_urls,
    };

    setSaving(true);
    try {
      if (product) {
        await updateProductAdmin(product.id, payload);
        toast.success("Producto actualizado");
      } else {
        await createProductAdmin(payload);
        toast.success("Producto creado");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(formatPostgrestError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            Catálogo en <span className="font-medium">enertech.products</span>. El slider del inicio usa productos{" "}
            <span className="font-medium">destacados</span> con imagen y respeta el orden indicado abajo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="p-name">Nombre</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <div className="flex justify-between gap-2 items-center">
              <Label htmlFor="p-slug">Slug</Label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={applySlugFromName}>
                Desde nombre
              </Button>
            </div>
            <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-code">Código (único)</Label>
            <Input id="p-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SKU interno / facturación" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-sku">SKU</Label>
            <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-brand">Marca</Label>
              <Input id="p-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-supp">Proveedor</Label>
              <Input id="p-supp" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-wh">Depósito</Label>
              <Input id="p-wh" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-at">Tipo de artículo</Label>
              <Input id="p-at" value={articleType} onChange={(e) => setArticleType(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-sit">Situación</Label>
            <Input id="p-sit" value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="Estado comercial / stock lógico" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-range">Rango</Label>
            <Input
              id="p-range"
              value={rangeLabel}
              onChange={(e) => setRangeLabel(e.target.value)}
              placeholder="Etiqueta de rango / línea comercial"
            />
          </div>
          <div className="grid gap-2">
            <Label>Categoría principal</Label>
            <Select
              value={categoryId || "__none__"}
              onValueChange={(v) => {
                const nv = v === "__none__" ? "" : v;
                setCategoryId(nv);
                setSubcategoryId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin categoría</SelectItem>
                {roots.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Subcategoría</Label>
            <Select
              disabled={!categoryId}
              value={subcategoryId || "__none__"}
              onValueChange={(v) => setSubcategoryId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className={!categoryId ? "opacity-60" : ""}>
                <SelectValue placeholder={categoryId ? "— opcional —" : "Primero elegí categoría principal"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— sin subcategoría —</SelectItem>
                {subcategoriesForSelection.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-short">Descripción corta</Label>
            <Input id="p-short" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-desc">Descripción</Label>
            <Textarea id="p-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="p-price">Precio (PYG)</Label>
              <Input id="p-price" type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-compare">Precio anterior</Label>
              <Input id="p-compare" type="number" min={0} step={1} value={compare} onChange={(e) => setCompare(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-stock">Stock</Label>
            <Input id="p-stock" type="number" min={0} step={1} value={stock} onChange={(e) => setStock(e.target.value)} required />
          </div>
          <div className="rounded-xl border border-border/15 bg-muted/20 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Slider del inicio (homepage)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                El carrusel muestra hasta <strong>5</strong> productos <strong>activos</strong>, <strong>destacados</strong> y con{" "}
                <strong>imagen</strong> (URL principal o primera de la galería). Sin número de orden, se ordenan por fecha de alta.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/15 bg-background p-3">
              <Label htmlFor="p-feat">Destacado</Label>
              <Switch id="p-feat" checked={featured} onCheckedChange={setFeatured} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-hero-order">Orden en el carrusel</Label>
              <Input
                id="p-hero-order"
                type="number"
                step={1}
                min={0}
                placeholder="Ej. 1 = primero; vacío = automático"
                value={heroSlideOrderStr}
                onChange={(e) => setHeroSlideOrderStr(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Menor número sale antes. Solo afecta si el producto está destacado y tiene imagen.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-primary-img">URL imagen principal (opcional)</Label>
              <Input
                id="p-primary-img"
                type="url"
                value={primaryImageUrl}
                onChange={(e) => setPrimaryImageUrl(e.target.value)}
                placeholder="https://…"
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/15 p-3">
            <Label htmlFor="p-act">Activo en tienda</Label>
            <Switch id="p-act" checked={active} onCheckedChange={setActive} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-img">Galería — URLs (una por línea)</Label>
            <Textarea
              id="p-img"
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              rows={4}
              placeholder={"https://…\nhttps://…"}
              className="text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Orden = orden en tienda; la primera fila es la imagen principal si no cargaste «URL imagen principal» arriba. Se guarda en{" "}
              <code className="rounded bg-muted px-1">product_images</code>.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
