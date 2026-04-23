import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types";
import {
  createCategoryAdmin,
  deleteCategoryAdmin,
  fetchCategoriesAdmin,
  updateCategoryAdmin,
} from "@/services/adminCategoryService";
import { directSubcategoriesOfRoot, isRootCategory, rootCategoriesSorted } from "@/lib/categoryHierarchy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DialogMode =
  | null
  | { kind: "create-root" }
  | { kind: "create-sub" }
  | { kind: "edit-root"; category: Category }
  | { kind: "edit-sub"; category: Category };

export default function AdminCategories() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogMode>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategoriesAdmin,
  });

  const roots = rootCategoriesSorted(rows);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const delMut = useMutation({
    mutationFn: deleteCategoryAdmin,
    onSuccess: () => {
      toast.success("Eliminada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const subsCountForRoot = (rootId: string) =>
    rows.filter((c) => c.parentId === rootId).length;

  const handleDelete = (c: Category) => {
    const subCount = isRootCategory(c) ? subsCountForRoot(c.id) : 0;
    if (subCount > 0) {
      toast.error("Eliminá primero las subcategorías de esta categoría principal.");
      return;
    }
    if (!confirm(`¿Eliminar "${c.name}"? Esta acción puede fallar si hay productos vinculados.`)) return;
    delMut.mutate(c.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mb-2">Catálogo</p>
          <h1 className="text-3xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl">
            Dos niveles únicamente: <strong>categorías principales</strong> y <strong>subcategorías</strong> que dependen de
            ellas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="default" onClick={() => setDialog({ kind: "create-root" })}>
            <Plus className="size-4 mr-2" />
            Categoría principal
          </Button>
          <Button type="button" variant="outline" onClick={() => setDialog({ kind: "create-sub" })}>
            <ChevronRight className="size-4 mr-2 opacity-70" />
            Subcategoría
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado jerárquico</CardTitle>
          <CardDescription>{isLoading ? "Cargando…" : `${roots.length} categorías principales · ${rows.length} registros totales`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {roots.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground">No hay categorías principales. Creá la primera arriba.</p>
          ) : (
            roots.map((root) => {
              const subs = directSubcategoriesOfRoot(rows, root.id);
              return (
                <div key={root.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border/60">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{root.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">
                        slug: {root.slug} · orden {root.sortOrder ?? 0} · {root.isActive ? "activa" : "inactiva"}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ kind: "edit-root", category: root })}>
                        <Pencil className="size-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(root)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  {subs.length > 0 ? (
                    <ul className="divide-y divide-border/60">
                      {subs.map((sub) => (
                        <li key={sub.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 pl-8 bg-background/80">
                          <div className="min-w-0">
                            <span className="text-sm">
                              <span className="text-muted-foreground mr-2">↳</span>
                              {sub.name}
                            </span>
                            <span className="block text-[11px] text-muted-foreground font-mono truncate">
                              {sub.slug} · orden {sub.sortOrder ?? 0}
                            </span>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ kind: "edit-sub", category: sub })}>
                              <Pencil className="size-3.5 mr-1" />
                              Editar
                            </Button>
                            <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(sub)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground px-4 py-3 pl-8 bg-background/50">Sin subcategorías.</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CategoryDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        roots={roots}
        onSaved={() => {
          invalidate();
          setDialog(null);
        }}
      />
    </div>
  );
}

function CategoryDialogs({
  dialog,
  onClose,
  roots,
  onSaved,
}: {
  dialog: DialogMode;
  onClose: () => void;
  roots: Category[];
  onSaved: () => void;
}) {
  const open = dialog != null;

  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");
  const [active, setActive] = useState(true);
  const [parentId, setParentId] = useState<string>("");

  useEffect(() => {
    if (!dialog) return;
    if (dialog.kind === "create-root") {
      setName("");
      setSort("0");
      setActive(true);
      setParentId("");
    } else if (dialog.kind === "create-sub") {
      setName("");
      setSort("0");
      setActive(true);
      setParentId(roots[0]?.id ?? "");
    } else if (dialog.kind === "edit-root") {
      const c = dialog.category;
      setName(c.name);
      setSort(String(c.sortOrder ?? 0));
      setActive(c.isActive);
      setParentId("");
    } else if (dialog.kind === "edit-sub") {
      const c = dialog.category;
      setName(c.name);
      setSort(String(c.sortOrder ?? 0));
      setActive(c.isActive);
      setParentId(c.parentId ?? "");
    }
  }, [dialog, roots]);

  const title =
    dialog?.kind === "create-root"
      ? "Nueva categoría principal"
      : dialog?.kind === "create-sub"
        ? "Nueva subcategoría"
        : dialog?.kind === "edit-root"
          ? "Editar categoría principal"
          : dialog?.kind === "edit-sub"
            ? "Editar subcategoría"
            : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    const sortN = Number(sort) || 0;
    try {
      if (dialog.kind === "create-root") {
        await createCategoryAdmin({
          name,
          parent_id: null,
          is_active: active,
          sort_order: sortN,
        });
        toast.success("Categoría principal creada");
      } else if (dialog.kind === "create-sub") {
        if (!parentId) {
          toast.error("Elegí la categoría principal.");
          return;
        }
        await createCategoryAdmin({
          name,
          parent_id: parentId,
          is_active: active,
          sort_order: sortN,
        });
        toast.success("Subcategoría creada");
      } else if (dialog.kind === "edit-root") {
        await updateCategoryAdmin(dialog.category.id, {
          name,
          parent_id: null,
          is_active: active,
          sort_order: sortN,
        });
        toast.success("Guardado");
      } else if (dialog.kind === "edit-sub") {
        if (!parentId) {
          toast.error("Elegí la categoría principal.");
          return;
        }
        await updateCategoryAdmin(dialog.category.id, {
          name,
          parent_id: parentId,
          is_active: active,
          sort_order: sortN,
        });
        toast.success("Guardado");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const showParentSelect =
    dialog?.kind === "create-sub" || dialog?.kind === "edit-sub";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {dialog?.kind === "create-root" || dialog?.kind === "edit-root"
              ? "Sin categoría padre: esta fila es el nivel superior del catálogo."
              : "La subcategoría depende solo de una categoría principal (no hay tercer nivel)."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {showParentSelect && (
            <div className="grid gap-2">
              <Label>Categoría principal</Label>
              <Select value={parentId || "__none__"} onValueChange={(v) => setParentId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegí una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {roots.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label>Orden</Label>
            <Input type="number" value={sort} onChange={(e) => setSort(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Activa</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
