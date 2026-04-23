// app/admin/productos/importar/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { checkExistingSlugs, importProductsBatch } from "@/actions/products-import";
import { genericRowsToProductInputs, validateGenericRow, type GenericProductRow } from "@/lib/csv-generic";
import { shopifyRowsToProductInputs, validateShopifyRow, type ShopifyProductRow } from "@/lib/csv-shopify";

type Step = 1 | 2 | 3 | 4;
type Format = "generic" | "shopify";

interface ParsedProduct {
  slug: string;
  name: string;
  status: "create" | "update" | "error";
  errorMessage?: string;
  input: any;
}

const BATCH_SIZE = 20;

export default function ImportProductsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [format, setFormat] = useState<Format>("generic");
  const [fileName, setFileName] = useState("");
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ created: 0, updated: 0, errors: [] as Array<{ slug: string; message: string }> });
  const [isProcessing, setIsProcessing] = useState(false);

  const toCreate = parsedProducts.filter((p) => p.status === "create");
  const toUpdate = parsedProducts.filter((p) => p.status === "update");
  const parseErrors = parsedProducts.filter((p) => p.status === "error");

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  }

  async function handlePreview() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

      // Normalize keys and values: trim whitespace that Excel/Sheets may add
      const normalizedData = parsed.data.map((row) => {
        const clean: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          clean[key.trim()] = typeof value === "string" ? value.trim() : (value ?? "");
        }
        return clean;
      });

      let productMap: Map<string, any>;
      const rowErrors: ParsedProduct[] = [];

      if (format === "generic") {
        const rows = normalizedData as unknown as GenericProductRow[];
        rows.forEach((row, i) => {
          const err = validateGenericRow(row, i);
          if (err) rowErrors.push({ slug: row.slug || `fila-${i+1}`, name: row.nombre || "", status: "error", errorMessage: err, input: null });
        });
        const validRows = rows.filter((_, i) => !validateGenericRow(_, i));
        productMap = genericRowsToProductInputs(validRows);
      } else {
        const rows = normalizedData as unknown as ShopifyProductRow[];
        rows.forEach((row, i) => {
          const err = validateShopifyRow(row, i);
          if (err) rowErrors.push({ slug: row.Handle || `fila-${i+1}`, name: row.Title || "", status: "error", errorMessage: err, input: null });
        });
        const validRows = rows.filter((_, i) => !validateShopifyRow(_, i));
        productMap = shopifyRowsToProductInputs(validRows);
      }

      const slugs = [...productMap.keys()];
      const existingSlugs = await checkExistingSlugs(slugs);
      const existingSet = new Set(existingSlugs);

      const products: ParsedProduct[] = [...productMap.entries()].map(([slug, input]) => ({
        slug,
        name: input.name,
        status: existingSet.has(slug) ? "update" : "create",
        input,
      }));

      setParsedProducts([...products, ...rowErrors]);
      setStep(2);
    } catch {
      alert("Error al procesar el archivo. Verifica que sea un CSV válido.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleImport() {
    setStep(3);
    setIsProcessing(true);

    const validProducts = parsedProducts.filter((p) => p.status !== "error");
    const inputs = validProducts.map((p) => p.input);
    const totalResult = { created: 0, updated: 0, errors: [] as any[] };

    try {
      for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
        const batch = inputs.slice(i, i + BATCH_SIZE);
        const batchResult = await importProductsBatch(batch);
        totalResult.created += batchResult.created;
        totalResult.updated += batchResult.updated;
        totalResult.errors.push(...batchResult.errors);
        setProgress(Math.round(((i + batch.length) / inputs.length) * 100));
      }
    } catch {
      totalResult.errors.push({ slug: "—", message: "Error de conexión durante el import" });
    } finally {
      setResult(totalResult);
      setIsProcessing(false);
      setStep(4);
    }
  }

  function downloadErrorCsv() {
    const rows = result.errors.map((e) => `${e.slug},${e.message}`).join("\n");
    const blob = new Blob([`slug,error\n${rows}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "errores-import.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-4 sm:p-0 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/productos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Importar Productos</h1>
          <p className="text-sm text-muted-foreground">Paso {step} de 4</p>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>1. Seleccionar archivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Formato del archivo</p>
              <div className="flex gap-4">
                {(["generic", "shopify"] as Format[]).map((f) => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="format"
                      value={f}
                      checked={format === f}
                      onChange={() => setFormat(f)}
                    />
                    <span className="text-sm">{f === "generic" ? "CSV Genérico" : "Shopify CSV"}</span>
                  </label>
                ))}
              </div>
            </div>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {fileName ? fileName : "Haz click para seleccionar un archivo .csv"}
              </p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </div>

            <Button
              onClick={handlePreview}
              disabled={!fileName || isProcessing}
              className="w-full"
            >
              {isProcessing ? "Analizando..." : "Siguiente — Previsualizar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>2. Previsualización</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{toCreate.length}</p>
                <p className="text-xs text-muted-foreground">A crear</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{toUpdate.length}</p>
                <p className="text-xs text-muted-foreground">A actualizar</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{parseErrors.length}</p>
                <p className="text-xs text-muted-foreground">Con error</p>
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3 space-y-1">
                <p className="text-sm font-medium text-red-700 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Filas con error (se saltarán)
                </p>
                {parseErrors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e.errorMessage}</p>
                ))}
                {parseErrors.length > 5 && <p className="text-xs text-red-500">...y {parseErrors.length - 5} más</p>}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <Button
                onClick={handleImport}
                disabled={toCreate.length + toUpdate.length === 0}
                className="flex-1"
              >
                Importar {toCreate.length + toUpdate.length} productos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Progress */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>3. Importando...</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">{progress}% completado</p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>4. Resultado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-green-500 mb-1" />
                <p className="text-2xl font-bold">{result.created}</p>
                <p className="text-xs text-muted-foreground">Creados</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <CheckCircle className="mx-auto h-6 w-6 text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{result.updated}</p>
                <p className="text-xs text-muted-foreground">Actualizados</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <XCircle className="mx-auto h-6 w-6 text-red-500 mb-1" />
                <p className="text-2xl font-bold">{result.errors.length}</p>
                <p className="text-xs text-muted-foreground">Errores</p>
              </div>
            </div>

            <div className="flex gap-3">
              {result.errors.length > 0 && (
                <Button variant="outline" onClick={downloadErrorCsv}>
                  Descargar errores CSV
                </Button>
              )}
              <Button className="flex-1" onClick={() => router.push("/admin/productos")}>
                Ver productos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
