import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Eye, Database, Activity, Boxes } from "lucide-react";
import { toast } from "sonner";
import { formatPYG } from "@/services/storeService";
import {
  fetchFastraxHealth,
  runFastraxProductSync,
  runFastraxStockSync,
  type FastraxSyncResult,
  type FastraxStockResult,
} from "@/services/adminFastraxSyncService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ConfirmTarget = "product" | "stock" | null;

function StatBadge({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" }) {
  const cls =
    tone === "good"
      ? "bg-primary text-primary-foreground"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
        : tone === "bad"
          ? "bg-destructive/15 text-destructive border border-destructive/30"
          : "bg-muted text-foreground";
  return (
    <Badge variant="secondary" className={`gap-1.5 font-normal ${cls}`}>
      <span className="tabular-nums font-semibold">{value}</span>
      {label}
    </Badge>
  );
}

function LogBlock({ logs }: { logs: string[] }) {
  if (!logs?.length) return null;
  return (
    <details className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs">
      <summary className="cursor-pointer select-none text-muted-foreground">Ver detalle ({logs.length} líneas)</summary>
      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
        {logs.join("\n")}
      </pre>
    </details>
  );
}

export default function AdminFastrax() {
  const queryClient = useQueryClient();
  const [allPages, setAllPages] = useState(false);
  const [size, setSize] = useState(50);
  const [maxPages, setMaxPages] = useState(20);
  const [productResult, setProductResult] = useState<FastraxSyncResult | null>(null);
  const [stockResult, setStockResult] = useState<FastraxStockResult | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const healthMut = useMutation({
    mutationFn: fetchFastraxHealth,
    onSuccess: (r) => {
      const v = typeof r.version === "string" ? r.version : JSON.stringify(r.version);
      setHealth({ ok: true, text: `Fastrax respondió. Versión: ${v}` });
      toast.success("Conexión Fastrax OK");
    },
    onError: (e: Error) => {
      setHealth({ ok: false, text: e.message });
      toast.error(e.message);
    },
  });

  const productMut = useMutation({
    mutationFn: (apply: boolean) =>
      runFastraxProductSync({
        apply,
        all: allPages,
        size,
        page: 1,
        maxPages: allPages ? maxPages : 1,
      }),
    onSuccess: (res) => {
      setProductResult(res);
      const s = res.stats;
      if (res.applied) {
        toast.success(`Importado: ${s.insert} nuevos, ${s.link} vinculados, ${s.update} actualizados`);
        invalidate();
      } else {
        toast.success(`Vista previa: ${s.insert} a insertar, ${s.update} a actualizar, ${s.skip} sin cambios`);
      }
      if (s.fail) toast.warning(`${s.fail} con error (ver detalle)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stockMut = useMutation({
    mutationFn: (apply: boolean) => runFastraxStockSync({ apply }),
    onSuccess: (res) => {
      setStockResult(res);
      const s = res.stats;
      if (res.applied) {
        toast.success(`Saldo/precio: ${s.updated} actualizados (${s.missing} sin dato)`);
        invalidate();
      } else {
        toast.success(`Vista previa saldo/precio: ${s.found} encontrados, ${s.missing} sin dato`);
      }
      if (s.fail) toast.warning(`${s.fail} con error (ver detalle)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = productMut.isPending || stockMut.isPending;

  const onConfirmApply = () => {
    const target = confirm;
    setConfirm(null);
    if (target === "product") productMut.mutate(true);
    else if (target === "stock") stockMut.mutate(true);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sincronizar Fastrax</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trae el catálogo desde Fastrax. Las credenciales viven solo en el servidor; el navegador nunca las ve.
          Todo arranca en <span className="font-medium text-foreground">vista previa</span>: nada se escribe hasta que toques
          <span className="font-medium text-foreground"> Aplicar</span>.
        </p>
      </div>

      {/* Conexión */}
      <Card className="border-border/50 shadow-soft rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="size-4 text-primary" />
            Conexión
          </CardTitle>
          <CardDescription>Verificá que el backend y Fastrax estén disponibles antes de sincronizar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" onClick={() => healthMut.mutate()} disabled={healthMut.isPending} className="gap-2">
            {healthMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Activity className="size-4" />}
            Probar conexión
          </Button>
          {health && (
            <p
              className={`text-sm font-mono break-words ${health.ok ? "text-primary" : "text-destructive"}`}
            >
              {health.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Catálogo */}
      <Card className="border-border/50 shadow-soft rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="size-4 text-primary" />
            Catálogo (productos)
          </CardTitle>
          <CardDescription>
            Productos nuevos entran <span className="font-medium">inactivos y no destacados</span> para que los revises antes de publicarlos.
            Los existentes solo actualizan su snapshot Fastrax (nunca pisan nombre/precio/stock que vos curaste).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-5">
            <div className="flex items-center gap-3">
              <Switch id="allPages" checked={allPages} onCheckedChange={setAllPages} disabled={busy} />
              <Label htmlFor="allPages" className="cursor-pointer">
                Todo el catálogo
                <span className="block text-xs font-normal text-muted-foreground">
                  {allPages ? "Recorre todas las páginas" : "Solo la primera página"}
                </span>
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">Productos por página</Label>
              <Input
                id="size"
                type="number"
                min={1}
                max={500}
                value={size}
                onChange={(e) => setSize(Math.max(1, Math.min(500, Number(e.target.value) || 50)))}
                disabled={busy}
                className="w-32"
              />
            </div>
            {allPages && (
              <div className="space-y-1.5">
                <Label htmlFor="maxPages">Máx. páginas</Label>
                <Input
                  id="maxPages"
                  type="number"
                  min={1}
                  max={500}
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.max(1, Math.min(500, Number(e.target.value) || 20)))}
                  disabled={busy}
                  className="w-32"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => productMut.mutate(false)} disabled={busy} className="gap-2">
              {productMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              Vista previa (dry-run)
            </Button>
            <Button type="button" onClick={() => setConfirm("product")} disabled={busy} className="gap-2">
              <Database className="size-4" />
              Aplicar importación
            </Button>
          </div>

          {productResult && (
            <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={productResult.applied ? "default" : "secondary"} className={productResult.applied ? "bg-primary" : ""}>
                  {productResult.applied ? "Aplicado" : "Vista previa"}
                </Badge>
                <span className="text-xs text-muted-foreground">índice ope=4: {productResult.indexCount} SKUs</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatBadge label="insertar" value={productResult.stats.insert} tone="good" />
                <StatBadge label="vincular" value={productResult.stats.link} tone="good" />
                <StatBadge label="actualizar" value={productResult.stats.update} />
                <StatBadge label="sin cambios" value={productResult.stats.skip} />
                <StatBadge label="con error" value={productResult.stats.fail} tone={productResult.stats.fail ? "bad" : undefined} />
              </div>

              {productResult.preview.length > 0 && (
                <div className="overflow-x-auto">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Muestra de productos a insertar (inactivos, no destacados):
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">SKU</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right w-20">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productResult.preview.map((r) => (
                        <TableRow key={r.sku}>
                          <TableCell className="font-mono text-xs tabular-nums">{r.sku}</TableCell>
                          <TableCell className="text-sm">{r.name || "—"}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {r.price != null ? formatPYG(r.price) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{r.stock ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <LogBlock logs={productResult.logs} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saldo / precio */}
      <Card className="border-border/50 shadow-soft rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="size-4 text-primary" />
            Saldo y precio
          </CardTitle>
          <CardDescription>
            Actualiza el snapshot <span className="font-mono text-xs">fastrax_stock</span> /{" "}
            <span className="font-mono text-xs">fastrax_price</span> de los productos ya vinculados. No toca el stock/precio que curaste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => stockMut.mutate(false)} disabled={busy} className="gap-2">
              {stockMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              Vista previa (dry-run)
            </Button>
            <Button type="button" onClick={() => setConfirm("stock")} disabled={busy} className="gap-2">
              <RefreshCw className="size-4" />
              Aplicar saldo/precio
            </Button>
          </div>

          {stockResult && (
            <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={stockResult.applied ? "default" : "secondary"} className={stockResult.applied ? "bg-primary" : ""}>
                  {stockResult.applied ? "Aplicado" : "Vista previa"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatBadge label="encontrados" value={stockResult.stats.found} tone="good" />
                <StatBadge label="actualizados" value={stockResult.stats.updated} tone="good" />
                <StatBadge label="sin dato" value={stockResult.stats.missing} tone={stockResult.stats.missing ? "warn" : undefined} />
                <StatBadge label="con error" value={stockResult.stats.fail} tone={stockResult.stats.fail ? "bad" : undefined} />
              </div>
              <LogBlock logs={stockResult.logs} />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "product" ? "¿Aplicar importación del catálogo?" : "¿Aplicar saldo y precio?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "product"
                ? "Se escribirán los cambios en la base de datos. Los productos nuevos entran inactivos y no destacados; los existentes solo actualizan su snapshot Fastrax. Esta acción no borra nada."
                : "Se actualizará el snapshot de saldo y precio Fastrax de los productos vinculados. No modifica el stock ni el precio que curaste."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmApply}>Aplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
