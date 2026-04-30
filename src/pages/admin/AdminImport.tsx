import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import type { ExcelCanonicalField } from "@/types";
import {
  EXCEL_FIELD_LABELS,
  importProductsFromExcel,
  parseExcelToObjects,
  type ColumnMapping,
} from "@/services/productImportService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELDS = Object.keys(EXCEL_FIELD_LABELS) as ExcelCanonicalField[];

/** Orden sugerido en plantilla y guía (obligatorios primero). */
const FIELD_ORDER: ExcelCanonicalField[] = [
  "codigo",
  "descripcion",
  "precio",
  "stock",
  "imagen",
  "destacado",
  "precio_tachado",
  "agrupacion",
  "tipo_articulo",
  "marca",
  "deposito",
  "proveedor",
  "rango",
  "fecha",
  "situacion",
];

function autoMapHeaders(sheet: ReturnType<typeof parseExcelToObjects>): ColumnMapping {
  const auto: ColumnMapping = {};
  for (const field of FIELDS) {
    const label = EXCEL_FIELD_LABELS[field];
    let hit =
      sheet.headers.find((h) => h.trim().toLowerCase() === label.toLowerCase()) ?? undefined;
    if (!hit) {
      if (field === "precio_tachado") {
        hit = sheet.headers.find((h) => /tach|anterior|compare/i.test(h.trim()));
      } else if (field === "precio") {
        hit = sheet.headers.find((h) => {
          const t = h.trim().toLowerCase();
          return t === "precio" || (t.startsWith("precio") && !/tach|anterior|compare/i.test(t));
        });
      }
    }
    if (!hit) {
      hit = sheet.headers.find((h) => h.trim().toLowerCase().includes(label.toLowerCase().slice(0, 6)));
    }
    if (hit) auto[field] = hit;
  }
  return auto;
}

function downloadExampleXlsx() {
  const headerRow = FIELD_ORDER.map((f) => EXCEL_FIELD_LABELS[f]);
  const row1 = [
    "BAT-EJ-001",
    "Batería 12V ejemplo importación",
    "350000",
    "5",
    "https://res.cloudinary.com/example/image.jpg",
    "si",
    "420000",
    "Energía y protección",
    "Baterías para UPS",
    "CSB",
    "Central",
    "Proveedor SA",
    "Standard",
    "2026-02-01",
    "Activo",
  ];
  const row2 = [
    "BAT-EJ-002",
    "Producto mínimo solo obligatorios",
    "0",
    "0",
    "",
    "no",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headerRow, row1, row2]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  XLSX.writeFile(wb, "enertech-plantilla-importacion-productos.xlsx");
}

export default function AdminImport() {
  const qc = useQueryClient();
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parsed, setParsed] = useState<ReturnType<typeof parseExcelToObjects> | null>(null);

  const headerOptions = useMemo(() => {
    if (!parsed?.headers.length) return [];
    return parsed.headers.filter(Boolean);
  }, [parsed]);

  const loadFile = async (file: File | null) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const sheet = parseExcelToObjects(buf);
    setParsed(sheet);
    setMapping(autoMapHeaders(sheet));
    toast.message(`Leídas ${sheet.rows.length} filas (${sheet.headers.length} columnas)`);
  };

  const importMut = useMutation({
    mutationFn: async () => {
      if (!parsed?.rows.length) throw new Error("Primero subí un Excel");
      return importProductsFromExcel(parsed.rows, mapping);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Importación: ${res.created} nuevos, ${res.updated} actualizados`);
      if (res.errors.length) toast.error(`${res.errors.length} errores (primera línea): ${res.errors[0]}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Importar Excel</h1>
      </div>

      <Card className="border-border/60 shadow-soft border-primary/15">
        <CardHeader>
          <CardTitle className="text-base">Guía rápida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-foreground/90 leading-relaxed">
          <p>
            <strong>Obligatorio en cada fila:</strong> <code className="text-xs bg-muted px-1 rounded">Codigo</code> y{" "}
            <code className="text-xs bg-muted px-1 rounded">Descripcion</code>. El código debe ser único: si ya existe en la base, se{" "}
            <strong>actualiza</strong> ese producto (incluye precio, stock, imagen si mapeás la columna, etc.).
          </p>
          <p>
            <strong>Opcional:</strong> Precio y Stock (enteros en Guaraníes / unidades; si no hay columna o está vacío → 0).{" "}
            <strong>Imagen</strong>: URL pública <code className="text-xs bg-muted px-1 rounded">https://…</code>; si está vacío en{" "}
            <strong>productos nuevos</strong> se usa imagen por defecto del sitio. <strong>Destacado</strong>: sí, si, true, 1, destacado (vacío
            = no). <strong>Precio Tachado</strong>: precio anterior/oferta; se guarda en ambas columnas compatibles de la base.
          </p>
          <p>
            <strong>Categorías:</strong> <code className="text-xs bg-muted px-1 rounded">Agrupacion</code> = categoría principal (se crea si no
            existe). <code className="text-xs bg-muted px-1 rounded">Tipo de Articulo</code> = subcategoría{" "}
            <strong>solo si</strong> hay Agrupación; si ponés solo Tipo de Articulo sin Agrupación, se usa como categoría principal.
          </p>
          <p className="text-muted-foreground">
            Primera fila del archivo = encabezados. Primera hoja del libro. Formatos <code className="text-xs bg-muted px-1 rounded">.xlsx</code> /{" "}
            <code className="text-xs bg-muted px-1 rounded">.xls</code>.
          </p>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => downloadExampleXlsx()}>
            <Download className="size-4" />
            Descargar plantilla de ejemplo (.xlsx)
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-soft overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base">Columnas admitidas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-left">
                <th className="px-4 py-2 font-semibold">Columna sugerida</th>
                <th className="px-4 py-2 font-semibold">Uso</th>
              </tr>
            </thead>
            <tbody>
              {FIELD_ORDER.map((f) => (
                <tr key={f} className="border-b border-border/40">
                  <td className="px-4 py-2 font-mono text-xs">{EXCEL_FIELD_LABELS[f]}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {f === "codigo" || f === "descripcion" ? (
                      <span className="text-foreground font-medium">Obligatoria</span>
                    ) : (
                      "Opcional"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-5 text-primary shrink-0" /> Archivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <InputFile onPick={(f) => void loadFile(f)} />

          {parsed && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS.map((field) => (
                  <div key={field} className="grid gap-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      {EXCEL_FIELD_LABELS[field]}
                    </Label>
                    <Select
                      value={mapping[field] ?? "__skip__"}
                      onValueChange={(v) =>
                        setMapping((m) => ({
                          ...m,
                          [field]: v === "__skip__" ? undefined : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ignorar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">— Ignorar —</SelectItem>
                        {headerOptions.map((h) => (
                          <SelectItem key={`${field}-${h}`} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button type="button" onClick={() => importMut.mutate()} disabled={importMut.isPending}>
                  {importMut.isPending ? "Importando…" : "Ejecutar importación"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InputFile({ onPick }: { onPick: (file: File | null) => void }) {
  return (
    <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-12 px-6 cursor-pointer hover:bg-muted/40 transition-colors">
      <Upload className="size-10 text-muted-foreground mb-3" />
      <span className="text-sm font-medium">Seleccionar .xlsx</span>
      <input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
