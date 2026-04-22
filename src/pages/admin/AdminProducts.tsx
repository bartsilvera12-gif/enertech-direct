import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatPYG } from "@/services/storeService";
import { fetchCategoriesAdmin, fetchProductsAdmin, updateProductAdmin } from "@/services/adminProductService";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AdminProductDialog } from "@/components/admin/AdminProductDialog";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchCategoriesAdmin,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: fetchProductsAdmin,
  });

  const invalidateStore = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const patchMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateProductAdmin>[1] }) =>
      updateProductAdmin(id, patch),
    onSuccess: () => {
      invalidateStore();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al actualizar"),
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
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Catálogo</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">Schema enertech.products · edición en tiempo real.</p>
        </div>
        <Button type="button" onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Nuevo producto
        </Button>
      </div>

      <Card className="border-border/15">
        <CardHeader>
          <CardTitle className="text-base">Inventario</CardTitle>
          <CardDescription>
            {isLoading ? "Cargando…" : `${rows.length} referencias · PYG`}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Cargando productos…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="w-[100px] text-right">Stock</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead>Destacado</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px]">
                      <button
                        type="button"
                        className="text-left hover:underline text-primary"
                        onClick={() => openEdit(p)}
                      >
                        {p.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums text-sm">{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-sm">{p.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPYG(p.price)}</TableCell>
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
                    <TableCell>
                      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => openEdit(p)}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
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
