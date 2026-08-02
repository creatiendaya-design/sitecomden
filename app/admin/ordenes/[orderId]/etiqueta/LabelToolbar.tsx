"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LABEL_FORMATS, type LabelFormatId } from "@/lib/orders/shipping-label";

interface LabelToolbarProps {
  orderId: string;
  format: LabelFormatId;
}

export default function LabelToolbar({ orderId, format }: LabelToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFormatChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("formato", value);
    router.replace(`/admin/ordenes/${orderId}/etiqueta?${params.toString()}`);
  };

  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/admin/ordenes/${orderId}`}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a la orden
        </Link>
      </Button>

      <div className="flex items-center gap-2">
        <Select value={format} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(LABEL_FORMATS).map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />
          Imprimir / Guardar PDF
        </Button>
      </div>
    </div>
  );
}
