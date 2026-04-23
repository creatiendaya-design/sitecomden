"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteZeroStockProducts } from "@/actions/inventory";

export default function BulkDeleteZeroStockButton({ zeroStockCount }: { zeroStockCount: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await deleteZeroStockProducts();
      if (res.success) {
        setResult(`${res.deleted} productos eliminados`);
        router.refresh();
      } else {
        setResult(res.error ?? "Error desconocido");
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (result) {
    return <p className="text-sm text-muted-foreground">{result}</p>;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-destructive font-medium">
          ¿Eliminar los {zeroStockCount} productos con 0 unidades?
        </span>
        <Button size="sm" variant="destructive" disabled={loading} onClick={handleDelete}>
          {loading ? "Eliminando…" : "Sí, eliminar"}
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  if (zeroStockCount === 0) return null;

  return (
    <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setConfirming(true)}>
      <Trash2 className="mr-2 h-4 w-4" />
      Eliminar {zeroStockCount} con 0 unidades
    </Button>
  );
}
