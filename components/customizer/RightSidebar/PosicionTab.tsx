// components/customizer/RightSidebar/PosicionTab.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "../store";
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd,
} from "lucide-react";

export function PosicionTab() {
  const layer = useBuilderStore((s) => s.getSelectedLayer());
  const update = useBuilderStore((s) => s.updateLayer);
  const template = useBuilderStore((s) => s.template);
  const activeZoneId = useBuilderStore((s) => s.activeZoneId);
  if (!layer || !template) return null;

  const zone = template.zones.find((z) => z.id === activeZoneId);
  if (!zone) return null;
  const b = zone.bounds;

  const buttons = [
    {
      icon: AlignHorizontalJustifyStart,
      title: "Alinear izquierda",
      apply: () => ({ x: b.xPct }),
    },
    {
      icon: AlignHorizontalJustifyCenter,
      title: "Centrar horizontal",
      apply: () => ({ x: b.xPct + b.widthPct / 2 }),
    },
    {
      icon: AlignHorizontalJustifyEnd,
      title: "Alinear derecha",
      apply: () => ({ x: b.xPct + b.widthPct }),
    },
    {
      icon: AlignVerticalJustifyStart,
      title: "Alinear arriba",
      apply: () => ({ y: b.yPct }),
    },
    {
      icon: AlignVerticalJustifyCenter,
      title: "Centrar vertical",
      apply: () => ({ y: b.yPct + b.heightPct / 2 }),
    },
    {
      icon: AlignVerticalJustifyEnd,
      title: "Alinear abajo",
      apply: () => ({ y: b.yPct + b.heightPct }),
    },
  ];

  return (
    <div className="space-y-3">
      <Label>Alinear dentro del área de impresión</Label>
      <div className="grid grid-cols-3 gap-2">
        {buttons.map(({ icon: Icon, title, apply }) => (
          <Button
            key={title}
            variant="outline"
            size="icon"
            title={title}
            onClick={() => update(layer.id, apply())}
          >
            <Icon className="size-4" />
          </Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        X: {layer.x.toFixed(1)}% · Y: {layer.y.toFixed(1)}%
      </div>
    </div>
  );
}
