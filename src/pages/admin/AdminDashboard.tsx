import { type ElementType } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ExternalLink, Layers, Package, Receipt, ShoppingCart, AlertTriangle } from "lucide-react";
import { formatPYG } from "@/services/storeService";
import { fetchAdminDashboardMetrics, LOW_STOCK_THRESHOLD } from "@/services/adminMetricsService";
import { fetchAdminTopProductsCurrentMonth } from "@/services/adminProductInterestService";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Package} label="Productos activos" value={isLoading ? "…" : String(stats?.productsActiveCount ?? 0)} />
        <Kpi icon={Layers} label="Categorías activas" value={isLoading ? "…" : String(stats?.categoriesActiveCount ?? 0)} />
        <Kpi icon={Receipt} label="Pedidos" value={isLoading ? "…" : String(stats?.ordersCount ?? 0)} />
        <Kpi icon={ShoppingCart} label="Stock total (uds.)" value={isLoading ? "…" : String(stats?.totalStockUnits ?? 0)} />
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/50 bg-card shadow-soft ring-1 ring-primary/[0.06]">
        <CardHeader className="flex flex-row flex-wrap items-center gap-4 justify-between space-y-0 border-b border-border/40 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
              <BarChart3 className="size-5" strokeWidth={1.75} aria-hidden />
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight">Productos con más interés (este mes)</CardTitle>
          </div>
          {!topLoading && dataUpdatedAt ? (
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {new Date(dataUpdatedAt).toLocaleString()}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="px-4 py-6 sm:px-6">
          {topError ? (
            <p className="text-sm text-destructive">
              No se pudo cargar el ranking (¿aplicaste la migración SQL 14?).{" "}
              <span className="text-muted-foreground">{topError instanceof Error ? topError.message : String(topError)}</span>
            </p>
          ) : topLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
          ) : topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] px-6 py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 mb-5">
                <BarChart3 className="size-7 opacity-80" strokeWidth={1.5} aria-hidden />
              </div>
              <p className="font-semibold text-foreground">Aún no hay eventos este mes</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
                Las vistas y clics desde la tienda aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/50 bg-muted/25 shadow-inner">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-muted/50 hover:bg-muted/50">
                    <TableHead className="min-w-[10rem] font-semibold">Producto</TableHead>
                    <TableHead className="whitespace-nowrap font-semibold">SKU</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">Categoría</TableHead>
                    <TableHead className="text-right tabular-nums font-semibold">Vistas</TableHead>
                    <TableHead className="text-right tabular-nums font-semibold">Clics</TableHead>
                    <TableHead className="text-right tabular-nums hidden sm:table-cell font-semibold">Desde buscar</TableHead>
                    <TableHead className="text-right tabular-nums font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((row) => (
                    <TableRow key={row.productId} className="border-border/40 hover:bg-background/80">
                      <TableCell className="font-medium">
                        <Link
                          to={`/product/${row.productSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-foreground hover:text-primary hover:underline underline-offset-4"
                        >
                          <span className="line-clamp-2">{row.productName}</span>
                          <ExternalLink className="size-3.5 shrink-0 opacity-50" aria-hidden />
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground font-mono text-xs">{row.sku}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[14rem] line-clamp-2">
                        {row.categoryLabel}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{row.views}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{row.clicks}</TableCell>
                      <TableCell className="text-right tabular-nums hidden sm:table-cell text-sm">{row.searchClicks}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="tabular-nums font-semibold shadow-sm">{row.totalInteractions}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Valor inventario estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {isLoading ? "…" : formatPYG(stats?.catalogValueGs ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Alertas de stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Agotados (activos)</span>
              <span className="font-semibold tabular-nums">{isLoading ? "…" : stats?.outOfStockCount ?? 0}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Stock bajo (≤ {LOW_STOCK_THRESHOLD} uds.)</span>
              <span className="font-semibold tabular-nums">{isLoading ? "…" : stats?.lowStockCount ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
              Referencias totales: {isLoading ? "…" : stats?.productsTotalCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {!isLoading && stats && stats.lowStockProducts.length > 0 ? (
        <Card className="rounded-2xl border-amber-500/25 bg-amber-500/[0.04] shadow-soft">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
            <CardTitle className="text-base font-semibold text-foreground">Reposición sugerida</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              {stats.lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 border-b border-border/15 pb-2 last:border-0 last:pb-0">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="tabular-nums text-muted-foreground shrink-0">{p.stock} uds.</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-sm text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
        <Link to="/admin/productos" className="font-medium text-primary underline-offset-4 hover:underline">
          Gestionar productos
        </Link>
        <span className="text-border">·</span>
        <Link to="/catalog" className="font-medium text-primary underline-offset-4 hover:underline">
          Ver catálogo público
        </Link>
      </p>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-soft transition-all duration-300 hover:border-primary/30 hover:shadow-md">
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-primary/[0.09] blur-2xl transition-opacity group-hover:bg-primary/[0.14]"
        aria-hidden
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 shadow-sm">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      </div>
    </div>
  );
}
