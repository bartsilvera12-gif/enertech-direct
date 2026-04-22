import { useEffect, useState } from "react";
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
  const [categoryId, setCategoryId] = useState<string>("");
  const [shortDesc, setShortDesc] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [compare, setCompare] = useState("");
  const [stock, setStock] = useState("");
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [specsJson, setSpecsJson] = useState("{}");
  const [imagesText, setImagesText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setSku(product.sku ?? "");
      setCategoryId(product.categoryId ?? "");
      setShortDesc(product.shortDescription ?? "");
      setDesc(product.description ?? "");
      setPrice(String(product.price));
      setCompare(product.compareAtPrice != null ? String(product.compareAtPrice) : "");
      setStock(String(product.stock));
      setFeatured(product.featured);
      setActive(product.isActive);
      setSpecsJson(JSON.stringify(product.specs ?? {}, null, 2));
      setImagesText(product.gallery.length ? product.gallery.join("\n") : product.mainImageUrl ?? "");
    } else {
      setName("");
      setSlug("");
      setSku("");
      setCategoryId(categories[0]?.id ?? "");
      setShortDesc("");
      setDesc("");
      setPrice("");
      setCompare("");
      setStock("0");
      setFeatured(false);
      setActive(true);
      setSpecsJson("{}");
      setImagesText("");
    }
  }, [open, product, categories]);

  const applySlugFromName = () => {
    setSlug(slugify(name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let specs: Record<string, string> = {};
    try {
      const parsed = JSON.parse(specsJson || "{}") as Record<string, unknown>;
      specs = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v ?? "")]));
    } catch {
      toast.error("JSON de especificaciones inválido");
      return;
    }
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

    const image_urls = imagesText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const payload: ProductUpsertInput = {
      name,
      slug,
      sku: sku || null,
      category_id: categoryId || null,
      short_description: shortDesc || null,
      description: desc || null,
      price: priceNum,
      compare_at_price: compareNum,
      stock: stockNum,
      featured,
      is_active: active,
      specs,
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
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>Schema enertech.products · imágenes en product_images.</DialogDescription>
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
            <Label htmlFor="p-sku">SKU</Label>
            <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select value={categoryId || "__none__"} onValueChange={(v) => setCategoryId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin categoría</SelectItem>
                {categories.map((c) => (
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
          <div className="flex items-center justify-between rounded-lg border border-border/15 p-3">
            <Label htmlFor="p-feat">Destacado</Label>
            <Switch id="p-feat" checked={featured} onCheckedChange={setFeatured} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/15 p-3">
            <Label htmlFor="p-act">Activo en tienda</Label>
            <Switch id="p-act" checked={active} onCheckedChange={setActive} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-specs">Especificaciones (JSON objeto)</Label>
            <Textarea id="p-specs" value={specsJson} onChange={(e) => setSpecsJson(e.target.value)} rows={4} className="font-mono text-xs" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-img">URLs de imagen (una por línea)</Label>
            <Textarea
              id="p-img"
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              rows={4}
              placeholder="https://..."
              className="text-xs"
            />
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
