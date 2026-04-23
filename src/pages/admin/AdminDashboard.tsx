import { type ElementType } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ExternalLink, Layers, Package, Receipt, ShoppingCart, AlertTriangle } from "lucide-react";
import { formatPYG } from "@/services/storeService";
import { fetchAdminDashboardMetrics, LOW_STOCK_THRESHOLD } from "@/services/adminMetricsService";
import { fetchAdminTopProductsCurrentMonth } from "@/services/adminProductInterestService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchAdminDashboardMetrics,
  });

  const {
    data: topProducts = [],
    isLoading: topLoading,
    error: topError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["admin", "top-products-month"],
    queryFn: () => fetchAdminTopProductsCurrentMonth(10),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (error) {
    return (
      <div className="max-w-6xl text-destructive text-sm">
        Error al cargar métricas: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl">
      <div>
        <p className="eyebrow mb-2">Resumen</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Datos en vivo desde Supabase · schema enertech.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Package}
          label="Productos activos"
          value={isLoading ? "…" : String(stats?.productsActiveCount ?? 0)}
          hint="Visibles en la tienda"
        />
        <Kpi
          icon={Layers}
          label="Categorías activas"
          value={isLoading ? "…" : String(stats?.categoriesActiveCount ?? 0)}
          hint="Taxonomía"
        />
        <Kpi
          icon={Receipt}
          label="Pedidos"
          value={isLoading ? "…" : String(stats?.ordersCount ?? 0)}
          hint="Órdenes registradas"
        />
        <Kpi
          icon={ShoppingCart}
          label="Stock total (uds.)"
          value={isLoading ? "…" : String(stats?.totalStockUnits ?? 0)}
          hint="Suma de unidades (activos)"
        />
      </div>

      <Card className="border-border/15 overflow-hidden">
        <CardHeader className="flex flex-row flex-wrap items-start gap-4 justify-between space-y-0 pb-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="size-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
            <div>
              <CardTitle className="text-base">Productos con más interés (este mes)</CardTitle>
              <CardDescription>
                Vista de detalle, clics en tarjetas y desde búsqueda. Datos desde la base · se actualiza cada minuto al tener el dashboard abierto.
              </CardDescription>
            </div>
          </div>
          {!topLoading && dataUpdatedAt ? (
            <p className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
              Actualizado {new Date(dataUpdatedAt).toLocaleString()}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-6">
          {topError ? (
            <p className="text-sm text-destructive px-6 sm:px-0">
              No se pudo cargar el ranking (¿aplicaste la migración SQL 14?).{" "}
              <span className="text-muted-foreground">{topError instanceof Error ? topError.message : String(topError)}</span>
            </p>
          ) : topLoading ? (
            <p className="text-sm text-muted-foreground px-6 sm:px-0">Cargando interacciones…</p>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 sm:px-0">
              Todavía no hay eventos registrados este mes. Navegación por la tienda público aparecerá aquí automáticamente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[10rem]">Producto</TableHead>
                  <TableHead className="whitespace-nowrap">SKU</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="text-right tabular-nums">Vistas</TableHead>
                  <TableHead className="text-right tabular-nums">Clics</TableHead>
                  <TableHead className="text-right tabular-nums hidden sm:table-cell">Desde buscar</TableHead>
                  <TableHead className="text-right tabular-nums font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/product/${row.productSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-primary hover:underline underline-offset-4"
                      >
                        <span className="line-clamp-2">{row.productName}</span>
                        <ExternalLink className="size-3.5 shrink-0 opacity-60" aria-hidden />
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground font-mono text-xs">{row.sku}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[14rem] line-clamp-2">
                      {row.categoryLabel}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.views}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">{row.searchClicks}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{row.totalInteractions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/15">
          <CardHeader>
            <CardTitle className="text-base">Valor inventario estimado</CardTitle>
            <CardDescription>Suma precio × stock (productos activos).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {isLoading ? "…" : formatPYG(stats?.catalogValueGs ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/15">
          <CardHeader>
            <CardTitle className="text-base">Alertas de stock</CardTitle>
            <CardDescription>Umbral bajo: ≤ {LOW_STOCK_THRESHOLD} uds. con stock &gt; 0.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Agotados (activos): </span>
              <span className="font-medium tabular-nums">{isLoading ? "…" : stats?.outOfStockCount ?? 0}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Stock bajo: </span>
              <span className="font-medium tabular-nums">{isLoading ? "…" : stats?.lowStockCount ?? 0}</span>
            </p>
            <p className="text-xs text-muted-foreground pt-2">
              Total referencias (incl. inactivos): {isLoading ? "…" : stats?.productsTotalCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {!isLoading && stats && stats.lowStockProducts.length > 0 ? (
        <Card className="border-amber-500/25 bg-amber-500/[0.03]">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-base">Reposición sugerida</CardTitle>
              <CardDescription>Hasta 25 ítems con menor stock.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {stats.lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 border-b border-border/10 pb-2 last:border-0">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="tabular-nums text-muted-foreground shrink-0">{p.stock} uds.</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground">
        <Link to="/admin/productos" className="text-primary underline-offset-4 hover:underline">
          Gestionar productos
        </Link>
        {" · "}
        <Link to="/catalog" className="text-primary underline-offset-4 hover:underline">
          Ver catálogo público
        </Link>
      </p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ElementType;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-border/15">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}
