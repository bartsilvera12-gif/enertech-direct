import { useMemo, useState } from "react";
import { Loader2, Search, Download, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
  searchFastraxProducts,
  importFastraxSkus,
  importFastraxPage,
  type FastraxSearchItem,
  type FastraxSearchResult,
  type FastraxImportResult,
} from "@/services/adminFastraxSyncService";
import { FastraxAuthedImage } from "@/components/admin/FastraxAuthedImage";
import { formatPYG } from "@/services/storeService";

export default function AdminFastraxSearch() {
  const [q, setQ] = useState("");
  const [skuQuery, setSkuQuery] = useState("");
  const [onlyStock, setOnlyStock] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [result, setResult] = useState<FastraxSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<FastraxImportResult | null>(null);
  const [confirmImportPage, setConfirmImportPage] = useState(false);

  const items: FastraxSearchItem[] = useMemo(() => result?.items ?? [], [result]);

  const runSearch = async (nextPage = 1) => {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await searchFastraxProducts({
        q: q.trim() || undefined,
        sku: skuQuery.trim() || undefined,
        page: nextPage,
        size,
        only_stock: onlyStock,
      });
      setResult(r);
      setPage(nextPage);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Búsqueda Fastrax falló", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (sku: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const importSelected = async () => {
    if (selected.size === 0) {
      toast.error("Seleccioná al menos un SKU.");
      return;
    }
    setImporting(true);
    try {
      const r = await importFastraxSkus({ skus: [...selected] });
      setLastImport(r);
      const { inserted, updated, linked, skipped, failed } = r.stats;
      toast.success(`Importados: ${inserted} nuevos, ${updated} actualizados, ${linked} vinculados. Omitidos: ${skipped}. Fallidos: ${failed}.`);
      setSelected(new Set());
    } catch (e) {
      toast.error("Import falló", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setImporting(false);
    }
  };

  const importWholePage = async () => {
    setImporting(true);
    setConfirmImportPage(false);
    try {
      const r = await importFastraxPage({ page, size });
      setLastImport(r);
      const { inserted, updated, linked, skipped, failed } = r.stats;
      toast.success(`Página ${page}: ${inserted} nuevos, ${updated} actualizados, ${linked} vinculados. Omitidos: ${skipped}. Fallidos: ${failed}.`);
    } catch (e) {
      toast.error("Import de página falló", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Buscador Fastrax</h1>
        <p className="text-sm text-muted-foreground">
          Lectura ope=4 + detalles ope=2. Importación por SKUs seleccionados o por página completa.
          Los productos nuevos entran <strong>inactivos</strong> hasta revisión del admin.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="size-4 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="q">Buscar (nombre, marca, categoría)</Label>
              <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="UPS, batería..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU exacto (ope=2 directo)</Label>
              <Input id="sku" value={skuQuery} onChange={(e) => setSkuQuery(e.target.value)} placeholder="12345" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">Tamaño página (1-20)</Label>
              <Input
                id="size"
                type="number"
                min={1}
                max={20}
                value={size}
                onChange={(e) => setSize(Math.max(1, Math.min(20, Math.floor(Number(e.target.value) || 20))))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <Label htmlFor="only-stock" className="cursor-pointer">
                Solo con stock
              </Label>
              <Switch id="only-stock" checked={onlyStock} onCheckedChange={setOnlyStock} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => runSearch(1)} disabled={loading}>
              {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Search className="size-4 mr-2" />}
              Buscar
            </Button>
            <Button variant="outline" disabled={loading || page <= 1} onClick={() => runSearch(page - 1)}>
              ← Anterior
            </Button>
            <span className="text-sm text-muted-foreground self-center px-2">Página {page}</span>
            <Button
              variant="outline"
              disabled={
                loading ||
                // Backend nuevo: usar has_more (página cruda Fastrax llena → hay más).
                // Fallback (backend viejo): items.length < size.
                result?.has_more === false ||
                (result?.has_more === undefined && (result?.items?.length || 0) < size)
              }
              onClick={() => runSearch(page + 1)}
            >
              Siguiente →
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base">Resultados</CardTitle>
            <CardDescription>
              {result?.total != null
                ? `${result.total} item${result.total === 1 ? "" : "s"}.${result.stats ? ` ope=2 batch: ${result.stats.ok_rows} ok / ${result.stats.missing} missing / ${result.stats.failed} failed.` : ""}`
                : "Hacé una búsqueda para ver resultados."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={importing || selected.size === 0} onClick={() => void importSelected()}>
              {importing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
              Importar selección ({selected.size})
            </Button>
            <Button variant="default" disabled={importing || items.length === 0} onClick={() => setConfirmImportPage(true)}>
              <Download className="size-4 mr-2" />
              Importar página
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-16">Img</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin resultados.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => {
                    const sku = it.fastrax_sku;
                    const hasImg = (it.image_count ?? 0) > 0;
                    return (
                      <TableRow key={sku}>
                        <TableCell>
                          <Checkbox checked={selected.has(sku)} onCheckedChange={() => toggle(sku)} />
                        </TableCell>
                        <TableCell>
                          {hasImg ? (
                            <FastraxAuthedImage sku={sku} img={1} alt={sku} />
                          ) : (
                            <div className="size-10 rounded border border-border/40 grid place-items-center text-muted-foreground">
                              <ImageIcon className="size-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{sku}</TableCell>
                        <TableCell className="max-w-[28rem] truncate">{it.name}</TableCell>
                        <TableCell>{it.brand || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-right tabular-nums">{it.price != null ? formatPYG(it.price) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {it.stock != null ? (
                            <Badge variant={it.stock > 0 ? "secondary" : "outline"}>{it.stock}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {lastImport ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Último import</CardTitle>
            <CardDescription>
              {lastImport.stats.inserted} nuevos · {lastImport.stats.updated} actualizados · {lastImport.stats.linked} vinculados ·{" "}
              {lastImport.stats.skipped} omitidos · {lastImport.stats.failed} fallidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Detalle ({lastImport.results.length} filas)</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                {lastImport.results
                  .map((r) => `${r.ok ? "✓" : "✗"} ${r.sku} ${r.action || r.skipped || r.error || ""}`)
                  .join("\n")}
              </pre>
            </details>
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={confirmImportPage} onOpenChange={setConfirmImportPage}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Importar página completa?</AlertDialogTitle>
            <AlertDialogDescription>
              Se van a importar TODOS los SKUs de la página {page} (hasta {size} items) desde Fastrax.
              Los productos nuevos quedan inactivos. Los SKUs ya curados en Enertech se omiten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void importWholePage()}>
              <RefreshCw className="size-4 mr-2" />
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
