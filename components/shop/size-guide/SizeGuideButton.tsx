// components/shop/size-guide/SizeGuideButton.tsx
"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import { SizeGuideModal } from "./SizeGuideModal";
import type { SizeGuideData } from "@/lib/size-guides/types";

interface Props {
  guide: SizeGuideData;
}

export function SizeGuideButton({ guide }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
      >
        <Ruler className="size-3.5" />
        Guía de tallas
      </button>
      <SizeGuideModal guide={guide} open={open} onOpenChange={setOpen} />
    </>
  );
}
