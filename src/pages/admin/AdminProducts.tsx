import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatPYG } from "@/services/storeService";
import { fetchCategoriesAdmin } from "@/services/adminCategoryService";
import {
  deleteProductAdmin,
  fetchProductsAdmin,
  updateProductAdmin,
} from "@/services/adminProductService";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AdminProductDialog } from "@/components/admin/AdminProductDialog";
import { formatPostgrestError } from "@/lib/postgrestError";

function productSearchHaystack(p: Product): string {
  const parts: (string | number | null | undefined)[] = [
    p.name,
    p.slug,
    p.sku,
    p.code,
    p.brand,
    p.supplier,
    p.warehouse,
    p.articleType,
    p.situation,
    p.rangeLabel,
    p.shortDescription,
    p.description,
    p.seoTitle,
    p.seoDescription,
    p.category?.name,
    p.subcategory?.name,
    p.price,
    p.stock,
    p.compareAtPrice,
    ...Object.values(p.specs ?? {}),
  ];
  return parts
    .filter((x) => x !== null && x !== undefined && String(x).trim() !== "")
    .map((x) => String(x))
    .join(" ")
    .toLowerCase();
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategoriesAdmin,
  });

  const {
    data: rows = [],
    isLoading,
    isError,
    error: productsError,
  } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchProductsAdmin,
    retry: 1,
  });

  useEffect(() => {
    if (isError && productsError) {
      toast.error(`No se pudo cargar el inventario: ${formatPostgrestError(productsError)}`);
    }
  }, [isError, productsError]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => productSearchHaystack(p).includes(q));
  }, [rows, searchQuery]);

  const invalidateStore = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateProductAdmin>[1] }) =>
      updateProductAdmin(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "products"] });
      const previous = queryClient.getQueryData<Product[]>(["admin", "products"]);
      if (previous) {
        queryClient.setQueryData<Product[]>(
          ["admin", "products"],
          previous.map((row) =>
            row.id === id
              ? {
                  ...row,
                  ...(patch.is_active !== undefined ? { isActive: patch.is_active } : {}),
                  ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
                  ...(patch.stock !== undefined ? { stock: patch.stock } : {}),
                }
              : row,
          ),
        );
      }
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["admin", "products"], ctx.previous);
      toast.error(formatPostgrestError(e));
    },
    onSuccess: (_data, vars) => {
      if (vars.patch.featured !== undefined) {
        toast.success(vars.patch.featured ? "Marcado como destacado" : "Quitado de destacados");
      } else if (vars.patch.is_active !== undefined) {
        toast.success(vars.patch.is_active ? "Producto activado" : "Producto desactivado");
      }
    },
    onSettled: () => {
      invalidateStore();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductAdmin(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "products"] });
      const previous = queryClient.getQueryData<Product[]>(["admin", "products"]);
      if (previous) {
        queryClient.setQueryData<Product[]>(
          ["admin", "products"],
          previous.filter((row) => row.id !== id),
        );
      }
      return { previous };
    },
    onError: (e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["admin", "products"], ctx.previous);
      toast.error(formatPostgrestError(e));
    },
    onSuccess: () => {
      toast.success("Producto eliminado");
      setDeleteTarget(null);
    },
    onSettled: () => {
      invalidateStore();
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Productos</h1>
        </div>
        <Button type="button" onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Nuevo producto
        </Button>
      </div>

      <Card className="border-border/50 shadow-soft rounded-2xl">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">
                {isLoading
                  ? "Inventario"
                  : isError
                    ? "Error al cargar"
                    : searchQuery.trim()
                      ? `${filteredRows.length} de ${rows.length} referencias`
                      : `${rows.length} referencias`}
              </CardTitle>
            </div>
            <div className="relative w-full lg:max-w-sm shrink-0">
              <Search
                className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Buscar por nombre, SKU, código, categoría, marca…"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
                aria-label="Buscar productos en el inventario cargado"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isError && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">Error al obtener productos</p>
              <p className="mt-1 text-destructive/90 font-mono text-xs break-all">
                {formatPostgrestError(productsError)}
              </p>
            </div>
          )}
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Cargando productos…</div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {rows.length === 0
                ? "No hay productos todavía."
                : "Ningún producto coincide con la búsqueda."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-11 text-muted-foreground font-normal">Nº</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="hidden md:table-cell">Sub</TableHead>
                  <TableHead className="hidden md:table-cell text-right w-[72px]">Dto.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="w-[92px] text-right">Stock</TableHead>
                  <TableHead className="w-[72px]">Act.</TableHead>
                  <TableHead className="w-[72px]">Dest.</TableHead>
                  <TableHead className="w-[140px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular-nums text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium max-w-[min(280px,40vw)]">
                      <button
                        type="button"
                        className="text-left hover:underline text-primary"
                        onClick={() => openEdit(p)}
                      >
                        {p.name}
                      </button>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground tabular-nums text-xs">{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <span className="line-clamp-2">{p.category?.name ?? "—"}</span>
                      <span className="md:hidden mt-0.5 block text-[11px] text-muted-foreground">
                        {p.subcategory?.name ? `↳ ${p.subcategory.name}` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[140px]">
                      <span className="line-clamp-2" title={p.subcategory?.name ?? undefined}>
                        {p.subcategory?.name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums text-sm text-muted-foreground">
                      {p.discountPercent != null ? (
                        <span className="text-destructive font-medium">−{p.discountPercent}%</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatPYG(p.price)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        className="h-8 text-right tabular-nums"
                        type="number"
                        min={0}
                        defaultValue={p.stock}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v) || v < 0) return;
                          if (v === p.stock) return;
                          patchMutation.mutate({ id: p.id, patch: { stock: v } });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={(checked) => patchMutation.mutate({ id: p.id, patch: { is_active: checked } })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.featured}
                        onCheckedChange={(checked) => patchMutation.mutate({ id: p.id, patch: { featured: checked } })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                          aria-label={`Eliminar ${p.name}`}
                          title="Eliminar producto"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Leyenda:</span>
        <Badge variant="secondary">Activo / Inactivo según switch</Badge>
        <Badge className="bg-primary">Destacado</Badge>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <span className="font-medium text-foreground">{deleteTarget?.name}</span>{" "}
              de forma permanente. Esta acción también borra sus imágenes asociadas y no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Eliminando…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        product={editing}
        onSaved={() => invalidateStore()}
      />
    </div>
  );
}
