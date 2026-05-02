// components/customizer/CustomizerTopBar.tsx
"use client";

import Link from "next/link";
import { ArrowLeft, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "./store";

interface Props {
  productSlug: string;
  productName: string;
}

export function CustomizerTopBar({ productSlug, productName }: Props) {
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const canUndo = useBuilderStore((s) => s.canUndo());
  const canRedo = useBuilderStore((s) => s.canRedo());
  const dirty = useBuilderStore((s) => s.dirty);

  const handleBack = (e: React.MouseEvent) => {
    if (dirty && !confirm("Tus cambios se perderán. ¿Estás seguro?")) {
      e.preventDefault();
    }
  };

  return (
    <header className="border-b px-4 py-2 flex items-center gap-3 bg-white">
      <Link
        href={`/productos/${productSlug}`}
        onClick={handleBack}
        className="flex items-center text-sm hover:underline"
      >
        <ArrowLeft className="size-4 mr-1" /> Volver al producto
      </Link>
      <span className="text-sm font-medium ml-2">·</span>
      <h1 className="text-sm font-medium truncate">{productName}</h1>
      <div className="ml-auto flex gap-1">
        <Button variant="ghost" size="icon" disabled={!canUndo} onClick={undo}>
          <Undo2 className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!canRedo} onClick={redo}>
          <Redo2 className="size-4" />
        </Button>
      </div>
    </header>
  );
}
