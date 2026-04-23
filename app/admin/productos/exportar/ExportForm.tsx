"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

interface ExportFormProps {
  categories: Category[];
}

export default function ExportForm({ categories }: ExportFormProps) {
  const [format, setFormat] = useState<"generic" | "shopify">("generic");
  const [estado, setEstado] = useState<"all" | "active" | "draft">("all");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);

  function handleExport() {
    setLoading(true);
    const params = new URLSearchParams({ format, estado });
    if (categoryId) params.set("categoryId", categoryId);
    const a = document.createElement("a");
    a.href = `/api/admin/products/export?${params.toString()}`;
    a.click();
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <div className="space-y-6 p-4 sm:p-0 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href="/admin/productos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Exportar Productos</h1>
          <p className="text-sm text-muted-foreground">Descarga tu catálogo en CSV</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Opciones de exportación</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Formato</Label>
            <div className="flex gap-4">
              {(["generic", "shopify"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} />
                  <span className="text-sm">{f === "generic" ? "CSV Genérico" : "Shopify CSV"}</span>
                </label>
              ))}
            </div>
            {format === "shopify" && (
              <p className="text-xs text-muted-foreground">Compatible con importación directa en Shopify</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={estado}
              onChange={(e) => setEstado(e.target.value as "all" | "active" | "draft")}
            >
              <option value="all">Todos</option>
              <option value="active">Solo activos</option>
              <option value="draft">Solo borradores</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría</Label>
            <select
              id="categoryId"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Generando..." : "Descargar CSV"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
