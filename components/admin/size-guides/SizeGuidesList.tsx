// components/admin/size-guides/SizeGuidesList.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Copy, Trash2, Plus } from "lucide-react";
import {
  deleteSizeGuide,
  duplicateSizeGuide,
  toggleSizeGuideActive,
} from "@/actions/size-guides";
import type { SizeGuideListItem } from "@/lib/size-guides/types";

interface Props {
  items: SizeGuideListItem[];
}

export function SizeGuidesList({ items }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onDelete = (item: SizeGuideListItem) => {
    const msg =
      item.productCount > 0
        ? `${item.productCount} producto(s) perderán su guía de tallas. ¿Continuar?`
        : "¿Eliminar esta guía?";
    if (!confirm(msg)) return;
    start(async () => {
      const r = await deleteSizeGuide(item.id);
      if (r.success) {
        toast.success("Guía eliminada");
        router.refresh();
      } else toast.error(r.error);
    });
  };

  const onDuplicate = (item: SizeGuideListItem) => {
    start(async () => {
      const r = await duplicateSizeGuide(item.id);
      if (r.success) {
        toast.success("Guía duplicada");
        router.push(`/admin/guia-tallas/${r.data.id}`);
      } else toast.error(r.error);
    });
  };

  const onToggle = (item: SizeGuideListItem) => {
    start(async () => {
      const r = await toggleSizeGuideActive(item.id);
      if (r.success) router.refresh();
      else toast.error(r.error);
    });
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex justify-end p-3 border-b">
        <Button asChild size="sm">
          <Link href="/admin/guia-tallas/nueva">
            <Plus className="mr-1 size-4" /> Nueva guía
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6 text-center">
          Aún no hay guías de tallas.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2">Productos</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/admin/guia-tallas/${item.id}`}
                    className="hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                <td className="px-3 py-2 uppercase text-muted-foreground">
                  {item.unit}
                </td>
                <td className="px-3 py-2">{item.productCount}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onToggle(item)}
                    disabled={pending}
                    className={
                      item.active
                        ? "text-green-700"
                        : "text-muted-foreground"
                    }
                  >
                    {item.active ? "● Activa" : "○ Inactiva"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right space-x-1">
                  <Button asChild size="icon" variant="ghost">
                    <Link href={`/admin/guia-tallas/${item.id}`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onDuplicate(item)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
