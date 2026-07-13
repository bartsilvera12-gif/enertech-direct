import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Send, FileText, Check, X, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatPostgrestError } from "@/lib/postgrestError";
import { cn } from "@/lib/utils";
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
  order_number: number;
  status: string;
  total: number | string;
  created_at: string;
  customer_name: string | null;
};

type ConfirmTarget =
  | { kind: "create"; orderId: string; orderNumber: string }
  | { kind: "invoice"; orderId: string; orderNumber: string }
  | null;

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  sent_whatsapp: { label: "WhatsApp", className: "bg-primary/10 text-primary border-primary/20" },
  confirmed: { label: "Confirmado", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  delivered: { label: "Entregado", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelado", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  draft: { label: "Borrador", className: "bg-muted text-muted-foreground border-transparent" },
};

function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, className: "bg-muted text-muted-foreground border-transparent" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", s.className)}>
      {s.label}
    </span>
  );
}

type FxTone = "idle" | "success" | "error" | "pending";

/** Deriva una vista limpia del estado en Fastrax a partir del tracking. */
function fastraxView(t: FastraxOrderTracking | null | undefined): {
  tone: FxTone;
  label: string;
  detail?: string;
  error?: string;
} {
  if (!t || (!t.fastrax_pdc && !t.fastrax_ped && !t.error)) return { tone: "idle", label: "Sin enviar" };
  if (t.error) return { tone: "error", label: "Rechazado", detail: t.fastrax_ped ? `ped ${t.fastrax_ped}` : undefined, error: t.error };
  if (t.fastrax_pdc) return { tone: "success", label: t.status_label || "En Fastrax", detail: `pdc ${t.fastrax_pdc}` };
  return { tone: "pending", label: t.status_label || "En proceso", detail: t.fastrax_ped ? `ped ${t.fastrax_ped}` : undefined };
}

const FX_DOT: Record<FxTone, string> = {
  idle: "bg-muted-foreground/40",
  success: "bg-emerald-500",
  error: "bg-red-500",
  pending: "bg-amber-500",
};
const FX_TEXT: Record<FxTone, string> = {
  idle: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
  pending: "text-amber-600 dark:text-amber-400",
};

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
        .select("id, order_number, status, total, created_at, customer_name")
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
      console.error("[AdminFastraxOrders] loadOrders falló:", e);
      toast.error("No se pudieron cargar pedidos", { description: formatPostgrestError(e) });
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
      toast.error("Error al enviar a Fastrax", { description: formatPostgrestError(e) });
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
      toast.error("Sincronización falló", { description: formatPostgrestError(e) });
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
      toast.error("Facturación falló", { description: formatPostgrestError(e) });
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
        String(o.order_number).includes(q) ||
        (o.customer_name?.toLowerCase().includes(q) ?? false) ||
        o.id.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q),
    );
  }, [orders, filter]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Pedidos Fastrax</h1>
        <p className="text-sm text-muted-foreground">
          Enviá pedidos al sistema Fastrax, consultá su estado y generá facturas. Cada acción pide confirmación.
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
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Pedido</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">Total</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Fastrax</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="py-16">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Inbox className="size-9 opacity-30" />
                        <span className="text-sm">Sin pedidos por ahora.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((o) => {
                    const t = trackingMap[o.id];
                    const hasMap = Boolean(t && (t.fastrax_pdc || t.fastrax_ped));
                    const cf = canFulfillMap[o.id];
                    const fx = fastraxView(t);
                    return (
                      <TableRow key={o.id} className="align-top border-border/60">
                        <TableCell className="py-3.5">
                          <div className="font-mono text-sm font-medium">ENT-{o.order_number}</div>
                          {o.customer_name ? (
                            <div className="text-xs text-muted-foreground mt-0.5">{o.customer_name}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-3.5 text-xs whitespace-nowrap">
                          <div className="text-foreground/80">{new Date(o.created_at).toLocaleDateString("es-PY")}</div>
                          <div className="text-muted-foreground mt-0.5">
                            {new Date(o.created_at).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <OrderStatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="py-3.5 text-right tabular-nums font-medium whitespace-nowrap">
                          {formatPYG(Number(o.total))}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col gap-1 max-w-[240px]">
                            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", FX_TEXT[fx.tone])}>
                              <span className={cn("size-1.5 rounded-full shrink-0", FX_DOT[fx.tone])} />
                              {fx.label}
                            </span>
                            {fx.detail ? (
                              <span className="text-[11px] text-muted-foreground font-mono">{fx.detail}</span>
                            ) : null}
                            {fx.error ? (
                              <span className="text-[11px] text-red-600 dark:text-red-400 leading-snug" title={fx.error}>
                                {fx.error}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              disabled={busy === o.id}
                              onClick={async () => {
                                const ok = await checkFulfill(o.id);
                                if (!ok) {
                                  toast.error("El pedido no tiene líneas Fastrax.");
                                  return;
                                }
                                setConfirm({ kind: "create", orderId: o.id, orderNumber: `ENT-${o.order_number}` });
                              }}
                            >
                              {busy === o.id ? (
                                <Loader2 className="size-3.5 mr-1 animate-spin" />
                              ) : (
                                <Send className="size-3.5 mr-1" />
                              )}
                              Enviar
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8"
                              title="Sincronizar estado"
                              aria-label="Sincronizar estado"
                              disabled={busy === o.id || !hasMap}
                              onClick={() => void doSyncStatus(o.id)}
                            >
                              <RefreshCw className="size-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-8"
                              title="Facturar"
                              aria-label="Facturar"
                              disabled={busy === o.id || !hasMap}
                              onClick={() => setConfirm({ kind: "invoice", orderId: o.id, orderNumber: `ENT-${o.order_number}` })}
                            >
                              <FileText className="size-3.5" />
                            </Button>
                          </div>
                          {cf === false ? (
                            <div className="text-[11px] text-muted-foreground mt-1.5 text-right">Sin líneas Fastrax.</div>
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
                ? `Se generará la factura del pedido ${confirm?.orderNumber} en Fastrax.`
                : `Se enviará el pedido ${confirm?.orderNumber} al sistema Fastrax para su preparación. Esta acción no se puede deshacer.`}
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
