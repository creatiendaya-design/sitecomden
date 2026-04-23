"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  productId: string;
  productName: string;
}

export default function InventoryDeleteButton({ productId, productName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/delete`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Error al eliminar el producto");
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground hidden sm:inline">¿Eliminar?</span>
        <Button size="sm" variant="destructive" disabled={loading} onClick={handleDelete} className="h-8 px-2 text-xs">
          {loading ? "…" : "Sí"}
        </Button>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => setConfirming(false)} className="h-8 px-2 text-xs">
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      title={`Eliminar ${productName}`}
      onClick={() => setConfirming(true)}
      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
