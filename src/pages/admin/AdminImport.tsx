import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import type { ExcelCanonicalField } from "@/types";
import {
  EXCEL_FIELD_LABELS,
  importProductsFromExcel,
  parseExcelToObjects,
  type ColumnMapping,
} from "@/services/productImportService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIELDS = Object.keys(EXCEL_FIELD_LABELS) as ExcelCanonicalField[];

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
    const auto: ColumnMapping = {};
    for (const field of FIELDS) {
      const label = EXCEL_FIELD_LABELS[field];
      const hit =
        sheet.headers.find((h) => h.trim().toLowerCase() === label.toLowerCase()) ??
        sheet.headers.find((h) => h.trim().toLowerCase().includes(label.toLowerCase().slice(0, 6)));
      if (hit) auto[field] = hit;
    }
    setMapping(auto);
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
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mb-2">Catálogo</p>
        <h1 className="text-3xl font-semibold tracking-tight">Importar productos</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
          Subí una hoja Excel (.xlsx) y mapeá cada columna a los campos estándar. Codigo debe ser único (actualiza si ya existe).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" /> Archivo
          </CardTitle>
          <CardDescription>Primera fila = encabezados.</CardDescription>
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
