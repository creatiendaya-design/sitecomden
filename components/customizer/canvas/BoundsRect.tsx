// components/customizer/canvas/BoundsRect.tsx
"use client";

import { Rect } from "react-konva";
import type { BoundsPct } from "@/lib/customizer/types";

interface Props {
  bounds: BoundsPct;
  stageWidth: number;
  stageHeight: number;
}

export function BoundsRect({ bounds, stageWidth, stageHeight }: Props) {
  return (
    <Rect
      x={(bounds.xPct / 100) * stageWidth}
      y={(bounds.yPct / 100) * stageHeight}
      width={(bounds.widthPct / 100) * stageWidth}
      height={(bounds.heightPct / 100) * stageHeight}
      stroke="#06b6d4"
      strokeWidth={1}
      dash={[6, 3]}
      listening={false}
    />
  );
}
