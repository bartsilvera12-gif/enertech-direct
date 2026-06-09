import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  CornerDownRight,
  Search,
  FolderPlus,
  Layers,
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DialogMode =
  | null
  | { kind: "create-root" }
  | { kind: "create-sub" }
  | { kind: "edit-root"; category: Category }
  | { kind: "edit-sub"; category: Category };

export default function AdminCategories() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [search, setSearch] = useState("");
  // Categoría candidata a eliminar. Cuando es != null se muestra el AlertDialog
  // integrado en vez del confirm() nativo del browser.
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

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
      setPendingDelete(null);
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setPendingDelete(null);
    },
  });

  const subsCountForRoot = (rootId: string) =>
    rows.filter((c) => c.parentId === rootId).length;

  const handleDelete = (c: Category) => {
    const subCount = isRootCategory(c) ? subsCountForRoot(c.id) : 0;
    if (subCount > 0) {
      toast.error("Eliminá primero las subcategorías de esta categoría principal.");
      return;
    }
    // Abre AlertDialog integrado en vez del confirm() nativo.
    setPendingDelete(c);
  };

  const filteredRoots = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return roots;
    return roots.filter((root) => {
      if (root.name.toLowerCase().includes(s) || root.slug.toLowerCase().includes(s)) return true;
      const subs = directSubcategoriesOfRoot(rows, root.id);
      return subs.some(
        (sub) => sub.name.toLowerCase().includes(s) || sub.slug.toLowerCase().includes(s),
      );
    });
  }, [roots, rows, search]);

  const totalSubs = rows.length - roots.length;
  const hasSearch = search.trim().length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">Catálogo</span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Categorías</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Organizá el catálogo en dos niveles: categorías principales y sus subcategorías.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            className="rounded-xl shadow-sm shadow-primary/15"
            onClick={() => setDialog({ kind: "create-root" })}
          >
            <Plus className="size-4 mr-2" />
            Categoría principal
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setDialog({ kind: "create-sub" })}
          >
            <CornerDownRight className="size-4 mr-2 opacity-70" />
            Subcategoría
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-soft rounded-2xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="flex items-center gap-2 mr-2">
            <StatChip icon={<FolderTree className="size-3.5" />} label="Principales" value={roots.length} tone="brand" />
            <StatChip icon={<Layers className="size-3.5" />} label="Subcategorías" value={totalSubs} />
            <span className="hidden sm:inline text-xs text-muted-foreground">·</span>
            <span className="hidden sm:inline text-xs text-muted-foreground">{rows.length} registros totales</span>
          </div>
          <div className="ml-auto relative w-full sm:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o slug…"
              className="pl-9 h-9 rounded-lg bg-background"
              aria-label="Buscar categorías"
            />
          </div>
        </div>

        <CardContent className="p-4 sm:p-5 space-y-3">
          {isLoading ? (
            <CategoriesSkeleton />
          ) : roots.length === 0 ? (
            <EmptyState
              icon={<FolderTree className="size-6 text-primary" />}
              title="Aún no hay categorías"
              description="Creá la primera categoría principal para empezar a organizar el catálogo."
              action={
                <Button type="button" onClick={() => setDialog({ kind: "create-root" })} className="rounded-xl">
                  <Plus className="size-4 mr-2" />
                  Crear categoría principal
                </Button>
              }
            />
          ) : filteredRoots.length === 0 ? (
            <EmptyState
              icon={<Search className="size-6 text-muted-foreground" />}
              title="Sin coincidencias"
              description={`No encontramos categorías que coincidan con “${search.trim()}”.`}
              action={
                <Button type="button" variant="outline" onClick={() => setSearch("")} className="rounded-xl">
                  Limpiar búsqueda
                </Button>
              }
            />
          ) : (
            filteredRoots.map((root) => {
              const subs = directSubcategoriesOfRoot(rows, root.id);
              return (
                <RootCategoryCard
                  key={root.id}
                  root={root}
                  subs={subs}
                  highlight={hasSearch ? search.trim().toLowerCase() : ""}
                  onEditRoot={() => setDialog({ kind: "edit-root", category: root })}
                  onDeleteRoot={() => handleDelete(root)}
                  onEditSub={(sub) => setDialog({ kind: "edit-sub", category: sub })}
                  onDeleteSub={(sub) => handleDelete(sub)}
                  onAddSub={() => setDialog({ kind: "create-sub" })}
                />
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

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(o) => {
          if (!o && !delMut.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-destructive/[0.10] text-destructive grid place-items-center ring-1 ring-inset ring-destructive/20">
                <Trash2 className="size-4" />
              </div>
              <AlertDialogTitle className="text-lg">
                Eliminar “{pendingDelete?.name}”
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Esta acción puede fallar si la categoría tiene productos vinculados. Los
              productos no se borran, pero quedarán sin categoría asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg" disabled={delMut.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={delMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) delMut.mutate(pendingDelete.id);
              }}
            >
              {delMut.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Subcomponentes presentacionales ---------- */

function StatChip({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "neutral" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "brand"
          ? "border-primary/25 bg-primary/[0.08] text-primary-deep"
          : "border-border/70 bg-card text-foreground/80",
      )}
    >
      <span className={cn("opacity-80", tone === "brand" ? "text-primary" : "text-muted-foreground")}>{icon}</span>
      <span className="tabular-nums font-semibold">{value}</span>
      <span className="text-muted-foreground font-normal">{label}</span>
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
        active
          ? "bg-primary/[0.10] text-primary-deep ring-1 ring-inset ring-primary/20"
          : "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/60")} aria-hidden />
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}

function MetaPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="font-mono text-foreground/80">{value}</span>
    </span>
  );
}

function RootCategoryCard({
  root,
  subs,
  highlight,
  onEditRoot,
  onDeleteRoot,
  onEditSub,
  onDeleteSub,
  onAddSub,
}: {
  root: Category;
  subs: Category[];
  highlight: string;
  onEditRoot: () => void;
  onDeleteRoot: () => void;
  onEditSub: (sub: Category) => void;
  onDeleteSub: (sub: Category) => void;
  onAddSub: () => void;
}) {
  const initial = root.name?.trim()?.charAt(0)?.toUpperCase() || "·";
  const matchesRoot =
    !!highlight && (root.name.toLowerCase().includes(highlight) || root.slug.toLowerCase().includes(highlight));

  return (
    <div className="group/root rounded-xl border border-border/70 bg-card overflow-hidden transition-shadow hover:shadow-soft">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border/60",
          "bg-gradient-to-r from-muted/40 via-muted/20 to-transparent",
          matchesRoot && "ring-1 ring-inset ring-primary/30",
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 size-9 rounded-lg bg-primary/[0.10] text-primary-deep grid place-items-center font-semibold text-sm ring-1 ring-inset ring-primary/15">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground truncate">{root.name}</p>
              <StatusBadge active={root.isActive} />
              <Badge
                variant="outline"
                className="rounded-full border-border/70 text-[10.5px] font-medium text-muted-foreground bg-background/60"
              >
                {subs.length} {subs.length === 1 ? "subcategoría" : "subcategorías"}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <MetaPill label="slug" value={root.slug} />
              <MetaPill label="orden" value={root.sortOrder ?? 0} />
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-foreground/80 hover:text-foreground hover:bg-muted"
            onClick={onEditRoot}
          >
            <Pencil className="size-3.5 mr-1.5" />
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10"
            onClick={onDeleteRoot}
            aria-label={`Eliminar categoría ${root.name}`}
            title="Eliminar"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {subs.length > 0 ? (
        <ul className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute left-[2.05rem] sm:left-[2.55rem] top-2 bottom-2 w-px bg-border/70"
          />
          {subs.map((sub) => {
            const subMatches =
              !!highlight && (sub.name.toLowerCase().includes(highlight) || sub.slug.toLowerCase().includes(highlight));
            return (
              <li
                key={sub.id}
                className={cn(
                  "relative flex flex-wrap items-center justify-between gap-3 pl-12 sm:pl-14 pr-4 sm:pr-5 py-2.5 transition-colors hover:bg-muted/30",
                  subMatches && "bg-primary/[0.04]",
                )}
              >
                <span
                  aria-hidden
                  className="absolute left-[2.05rem] sm:left-[2.55rem] top-1/2 h-px w-3 bg-border/70"
                />
                <div className="min-w-0 flex items-center gap-2.5">
                  <CornerDownRight className="size-3.5 text-muted-foreground/70 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{sub.name}</span>
                      {!sub.isActive ? <StatusBadge active={false} /> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <MetaPill label="slug" value={sub.slug} />
                      <MetaPill label="orden" value={sub.sortOrder ?? 0} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 rounded-lg text-foreground/75 hover:text-foreground hover:bg-muted"
                    onClick={() => onEditSub(sub)}
                  >
                    <Pencil className="size-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg text-destructive/75 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDeleteSub(sub)}
                    aria-label={`Eliminar subcategoría ${sub.name}`}
                    title="Eliminar"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 pl-12 sm:pl-14 bg-background/60">
          <p className="text-xs text-muted-foreground italic">Aún no tiene subcategorías.</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 rounded-lg text-primary-deep hover:text-primary-deep hover:bg-primary/[0.08]"
            onClick={onAddSub}
          >
            <FolderPlus className="size-3.5 mr-1.5" />
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border/60 bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
          <div className="px-5 py-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border/70 bg-background/50">
      <div className="size-12 rounded-full bg-primary/[0.08] grid place-items-center mb-4 ring-1 ring-inset ring-primary/15">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
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

  const isRootDialog = dialog?.kind === "create-root" || dialog?.kind === "edit-root";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary/[0.10] text-primary-deep grid place-items-center ring-1 ring-inset ring-primary/15">
              {isRootDialog ? <FolderTree className="size-4" /> : <CornerDownRight className="size-4" />}
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription>
            {isRootDialog
              ? "Sin categoría padre: esta fila es el nivel superior del catálogo."
              : "La subcategoría depende solo de una categoría principal (no hay tercer nivel)."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 pt-1" onSubmit={(e) => void handleSubmit(e)}>
          {showParentSelect && (
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium text-foreground/80 uppercase tracking-wider">Categoría principal</Label>
              <Select value={parentId || "__none__"} onValueChange={(v) => setParentId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="rounded-lg">
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
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium text-foreground/80 uppercase tracking-wider">Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isRootDialog ? "Ej.: Energía y protección" : "Ej.: UPS"}
              className="rounded-lg"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium text-foreground/80 uppercase tracking-wider">Orden</Label>
            <Input
              type="number"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground">Menor número aparece antes en el catálogo.</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-foreground">Visible en la tienda</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Si está apagada, no aparece en el catálogo público.
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" className="rounded-lg" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="submit" className="rounded-lg shadow-sm shadow-primary/15">
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
