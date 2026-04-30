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
import { formatPostgrestError } from "@/lib/postgrestError";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

const REQUIRED_FIELDS: ExcelCanonicalField[] = ["codigo", "descripcion"];
const OPTIONAL_FIELDS: ExcelCanonicalField[] = FIELD_ORDER.filter(
  (f) => !REQUIRED_FIELDS.includes(f),
);

const PREVIEW_ROWS = 5;

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

function previewCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

export default function AdminImport() {
  const qc = useQueryClient();
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parsed, setParsed] = useState<ReturnType<typeof parseExcelToObjects> | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  const headerOptions = useMemo(() => {
    if (!parsed?.headers.length) return [];
    return parsed.headers.filter(Boolean);
  }, [parsed]);

  const previewSlice = useMemo(() => {
    if (!parsed?.rows.length) return [];
    return parsed.rows.slice(0, PREVIEW_ROWS);
  }, [parsed]);

  const loadFile = async (file: File | null) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const sheet = parseExcelToObjects(buf);
    setParsed(sheet);
    setLoadedFileName(file.name);
    setMapping(autoMapHeaders(sheet));
    toast.success(`Archivo cargado: ${sheet.rows.length} filas · ${sheet.headers.length} columnas`);
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
      if (res.errors.length) {
        const maxLines = 15;
        const lines = res.errors.slice(0, maxLines);
        const rest = res.errors.length - lines.length;
        toast.error(`Errores en ${res.errors.length} fila(s)`, {
          description:
            lines.join("\n") + (rest > 0 ? `\n… y ${rest} más` : ""),
          duration: Math.min(12000 + res.errors.length * 400, 25000),
        });
      }
    },
    onError: (e: unknown) => toast.error(formatPostgrestError(e)),
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

      <Accordion type="single" collapsible className="rounded-lg border border-border/60 bg-card px-4 shadow-soft">
        <AccordionItem value="column-ref" className="border-0">
          <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">
            Lista de columnas admitidas (referencia)
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="overflow-x-auto rounded-md border border-border/50">
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
                        {REQUIRED_FIELDS.includes(f) ? (
                          <span className="text-foreground font-medium">Obligatoria</span>
                        ) : (
                          "Opcional"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-5 text-primary shrink-0" /> Archivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <InputFile onPick={(f) => void loadFile(f)} />

          {parsed && loadedFileName && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <span className="text-sm font-medium text-foreground">Archivo:</span>
                  <span className="text-sm font-mono break-all">{loadedFileName}</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span>
                    <strong className="text-foreground">{parsed.rows.length}</strong>{" "}
                    <span className="text-muted-foreground">filas de datos</span>
                  </span>
                  <span>
                    <strong className="text-foreground">{parsed.headers.filter(Boolean).length}</strong>{" "}
                    <span className="text-muted-foreground">columnas detectadas</span>
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Encabezados detectados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.headers.filter(Boolean).map((h) => (
                      <Badge key={h} variant="secondary" className="font-normal text-xs max-w-full truncate" title={h}>
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Vista previa (primeras {PREVIEW_ROWS} filas)</h3>
                    <span className="text-xs text-muted-foreground">Según columnas del Excel</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border/60 bg-muted/10">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="sticky left-0 z-[1] bg-muted/90 px-2 py-2 text-left font-semibold whitespace-nowrap border-r border-border/60">
                            #
                          </th>
                          {parsed.headers.map((h, idx) => (
                            <th
                              key={`h-${idx}-${h}`}
                              className="px-2 py-2 text-left font-semibold whitespace-nowrap min-w-[7rem] max-w-[14rem]"
                              title={h}
                            >
                              {h || `(vacío ${idx + 1})`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewSlice.map((row, ri) => (
                          <tr key={ri} className="border-b border-border/40 last:border-0">
                            <td className="sticky left-0 z-[1] bg-background/95 px-2 py-1.5 font-mono text-muted-foreground border-r border-border/60">
                              {ri + 2}
                            </td>
                            {parsed.headers.map((_, ci) => (
                              <td
                                key={ci}
                                className="px-2 py-1.5 align-top text-foreground/90 max-w-[14rem]"
                                title={String(row[ci] ?? "")}
                              >
                                <span className="line-clamp-2 break-words">{previewCell(row[ci])}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-5 min-w-0">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Mapeo a campos del sistema</h3>
                    <p className="text-xs text-muted-foreground leading-snug">
                      Elegí qué columna del Excel corresponde a cada campo. <strong>Código</strong> y <strong>Descripción</strong> son obligatorios
                      para crear filas nuevas.
                    </p>
                  </div>

                  <div className="rounded-lg border-2 border-primary/35 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-[10px] uppercase tracking-wide">
                        Obligatorias
                      </Badge>
                      <span className="text-xs text-muted-foreground">Deben tener columna asignada para importar correctamente</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {REQUIRED_FIELDS.map((field) => (
                        <MappingRow
                          key={field}
                          field={field}
                          required
                          headerOptions={headerOptions}
                          value={mapping[field] ?? "__skip__"}
                          onChange={(v) =>
                            setMapping((m) => ({
                              ...m,
                              [field]: v === "__skip__" ? undefined : v,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        Opcionales
                      </Badge>
                      <span className="text-xs text-muted-foreground">Precio, stock, categorías, etc.</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {OPTIONAL_FIELDS.map((field) => (
                        <MappingRow
                          key={field}
                          field={field}
                          headerOptions={headerOptions}
                          value={mapping[field] ?? "__skip__"}
                          onChange={(v) =>
                            setMapping((m) => ({
                              ...m,
                              [field]: v === "__skip__" ? undefined : v,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
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

function MappingRow({
  field,
  required,
  headerOptions,
  value,
  onChange,
}: {
  field: ExcelCanonicalField;
  required?: boolean;
  headerOptions: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={`grid gap-1.5 ${required ? "" : ""}`}>
      <Label className="flex flex-wrap items-center gap-2 text-xs font-medium text-foreground">
        <span>{EXCEL_FIELD_LABELS[field]}</span>
        {required && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Obligatorio
          </Badge>
        )}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={required && value === "__skip__" ? "border-amber-500/70 bg-amber-500/5" : undefined}>
          <SelectValue placeholder="Sin columna" />
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
