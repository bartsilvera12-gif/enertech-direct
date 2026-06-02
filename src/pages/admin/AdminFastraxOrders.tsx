import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Send, FileText, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/lib/supabase";
import { formatPYG } from "@/services/storeService";
import {
  createOrderInFastrax,
  fetchOrderCanFulfillFastrax,
  fetchOrderFastraxStatus,
  invoiceOrderInFastrax,
  syncOrderFastraxStatus,
  type FastraxOrderTracking,
} from "@/services/adminFastraxSyncService";

type AdminOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer_id: string | null;
};

type ConfirmTarget =
  | { kind: "create"; orderId: string; orderNumber: string }
  | { kind: "invoice"; orderId: string; orderNumber: string }
  | null;

export default function AdminFastraxOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingMap, setTrackingMap] = useState<Record<string, FastraxOrderTracking | null>>({});
  const [canFulfillMap, setCanFulfillMap] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);
  const [filter, setFilter] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, customer_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const list = (data || []) as AdminOrder[];
      setOrders(list);
      const ids = list.map((o) => o.id);
      // batch tracking
      try {
        const r = await fetch(`${(import.meta.env.VITE_FASTRAX_BACKEND_URL?.trim() || "http://localhost:8787").replace(/\/+$/, "")}/api/admin/orders/fastrax/status-bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
          },
          body: JSON.stringify({ orderIds: ids }),
        });
        const body = (await r.json()) as { ok: boolean; items: Array<{ order_id: string; tracking: FastraxOrderTracking }> };
        const m: Record<string, FastraxOrderTracking | null> = {};
        for (const id of ids) m[id] = null;
        for (const it of body.items || []) m[it.order_id] = it.tracking;
        setTrackingMap(m);
      } catch {
        // silencio — backend Fastrax puede no estar arriba
      }
    } catch (e) {
      toast.error("No se pudieron cargar pedidos", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const checkFulfill = async (id: string) => {
    try {
      const r = await fetchOrderCanFulfillFastrax(id);
      setCanFulfillMap((m) => ({ ...m, [id]: r.ok }));
      return r.ok;
    } catch {
      return false;
    }
  };

  const doCreate = async (id: string) => {
    setBusy(id);
    setConfirm(null);
    try {
      const r = await createOrderInFastrax(id, { confirm: true });
      if (r.ok) {
        toast.success(`Pedido enviado a Fastrax. pdc=${r.fastrax_pdc || "—"}`);
      } else {
        toast.error("Error al enviar a Fastrax", { description: r.error || r.reason || "ope=12" });
      }
      await refreshTracking(id);
    } catch (e) {
      toast.error("Error al enviar a Fastrax", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const doSyncStatus = async (id: string) => {
    setBusy(id);
    try {
      const r = await syncOrderFastraxStatus(id);
      setTrackingMap((m) => ({ ...m, [id]: r.tracking }));
      if (r.ok) toast.success(`Estado actualizado: ${r.tracking?.status_label || "—"}`);
      else toast.error("ope=13 falló", { description: r.reason || "—" });
    } catch (e) {
      toast.error("Sincronización falló", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const doInvoice = async (id: string) => {
    setBusy(id);
    setConfirm(null);
    try {
      const r = await invoiceOrderInFastrax(id);
      if (r.ok) toast.success("Factura solicitada en Fastrax (ope=15).");
      else toast.error("Facturación falló", { description: r.message });
      await refreshTracking(id);
    } catch (e) {
      toast.error("Facturación falló", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const refreshTracking = async (id: string) => {
    try {
      const r = await fetchOrderFastraxStatus(id);
      setTrackingMap((m) => ({ ...m, [id]: r.tracking }));
    } catch {
      // ignore
    }
  };

  const filteredOrders = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q),
    );
  }, [orders, filter]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Pedidos Fastrax</h1>
        <p className="text-sm text-muted-foreground">
          Disparo manual de <code>ope=12</code> (enviar pedido), <code>ope=13</code> (sincronizar estado) y{" "}
          <code>ope=15</code> (facturar). Doble cerrojo: requiere <code>FASTRAX_CREATE_REMOTE_ORDERS=1</code> +
          confirmación.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Últimos 50 pedidos</CardTitle>
            <CardDescription>El badge "Fastrax" aparece cuando el pedido tiene líneas Fastrax.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por número, id o estado…"
              className="w-64"
            />
            <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
              {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <RefreshCw className="size-4 mr-2" />}
              Recargar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fastrax</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Sin pedidos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((o) => {
                    const t = trackingMap[o.id];
                    const hasMap = Boolean(t && (t.fastrax_pdc || t.fastrax_ped));
                    const cf = canFulfillMap[o.id];
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleString("es-PY")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{o.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatPYG(o.total_amount)}</TableCell>
                        <TableCell>
                          {hasMap ? (
                            <div className="text-xs space-y-0.5">
                              <div>
                                pdc: <span className="font-mono">{t?.fastrax_pdc || "—"}</span>
                              </div>
                              <div>
                                ped: <span className="font-mono">{t?.fastrax_ped || "—"}</span>
                              </div>
                              <div>
                                <Badge variant={t?.status_code === 7 ? "secondary" : "outline"}>
                                  {t?.status_label || "—"}
                                </Badge>
                                {t?.error ? <span className="text-destructive ml-2">{t.error.slice(0, 60)}</span> : null}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">sin mapa</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy === o.id}
                              onClick={async () => {
                                const ok = await checkFulfill(o.id);
                                if (!ok) {
                                  toast.error("El pedido no tiene líneas Fastrax.");
                                  return;
                                }
                                setConfirm({ kind: "create", orderId: o.id, orderNumber: o.order_number });
                              }}
                            >
                              <Send className="size-3.5 mr-1" />
                              Enviar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy === o.id || !hasMap}
                              onClick={() => void doSyncStatus(o.id)}
                            >
                              <RefreshCw className="size-3.5 mr-1" />
                              Estado
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy === o.id || !hasMap}
                              onClick={() => setConfirm({ kind: "invoice", orderId: o.id, orderNumber: o.order_number })}
                            >
                              <FileText className="size-3.5 mr-1" />
                              Facturar
                            </Button>
                          </div>
                          {cf === false ? (
                            <div className="text-[11px] text-muted-foreground mt-1">Sin líneas Fastrax.</div>
                          ) : null}
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

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "invoice" ? "¿Facturar pedido en Fastrax?" : "¿Enviar pedido a Fastrax?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "invoice"
                ? `Esto ejecutará ope=15 sobre el pedido ${confirm?.orderNumber}. La acción crea una factura en Fastrax.`
                : `Esto ejecutará ope=12 sobre el pedido ${confirm?.orderNumber}. Requiere FASTRAX_CREATE_REMOTE_ORDERS=1 en el server.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <X className="size-4 mr-2" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "create") void doCreate(confirm.orderId);
                else void doInvoice(confirm.orderId);
              }}
            >
              <Check className="size-4 mr-2" />
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
