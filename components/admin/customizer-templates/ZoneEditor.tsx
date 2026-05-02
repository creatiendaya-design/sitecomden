// components/admin/customizer-templates/ZoneEditor.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Layer, Image, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { PrintZone, BoundsPct } from "@/lib/customizer/types";

// Stage is the only real React component in react-konva v19; everything
// else (Layer, Rect, Image, Transformer) is just a string token consumed by
// the Konva reconciler — they can't be dynamic-imported as components.
const Stage = dynamic(
  () => import("react-konva").then((m) => ({ default: m.Stage })),
  { ssr: false }
);

interface ZoneEditorProps {
  zone: PrintZone;
  onChange: (zone: PrintZone) => void;
}

export function ZoneEditor({ zone, onChange }: ZoneEditorProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: 600, h: 600 });
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (!zone.mockupImage) return;
    setImg(null);
    const i = new window.Image();
    i.src = zone.mockupImage;
    i.onload = () => {
      setImg(i);
      const aspect = i.height / i.width;
      setStageSize({ w: 600, h: 600 * aspect });
    };
    i.onerror = () => {
      console.error("[ZoneEditor] failed to load mockup:", zone.mockupImage);
    };
  }, [zone.mockupImage]);

  useEffect(() => {
    if (rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [img]);

  if (!img) {
    return (
      <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
        {zone.mockupImage ? "Cargando mockup…" : "Sube un mockup primero"}
      </div>
    );
  }

  const pxBounds = {
    x: (zone.bounds.xPct / 100) * stageSize.w,
    y: (zone.bounds.yPct / 100) * stageSize.h,
    width: (zone.bounds.widthPct / 100) * stageSize.w,
    height: (zone.bounds.heightPct / 100) * stageSize.h,
  };

  function emit(b: { x: number; y: number; width: number; height: number }) {
    const newBounds: BoundsPct = {
      xPct: (b.x / stageSize.w) * 100,
      yPct: (b.y / stageSize.h) * 100,
      widthPct: (b.width / stageSize.w) * 100,
      heightPct: (b.height / stageSize.h) * 100,
    };
    onChange({ ...zone, bounds: newBounds });
  }

  return (
    <div className="border rounded-lg overflow-hidden inline-block">
      <Stage width={stageSize.w} height={stageSize.h}>
        <Layer>
          <Image image={img} width={stageSize.w} height={stageSize.h} />
          <Rect
            ref={rectRef}
            x={pxBounds.x}
            y={pxBounds.y}
            width={pxBounds.width}
            height={pxBounds.height}
            stroke="#06b6d4"
            strokeWidth={2}
            dash={[8, 4]}
            draggable
            onDragEnd={(e) => {
              const node = e.target;
              emit({ x: node.x(), y: node.y(), width: pxBounds.width, height: pxBounds.height });
            }}
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              emit({
                x: node.x(),
                y: node.y(),
                width: Math.max(20, node.width() * scaleX),
                height: Math.max(20, node.height() * scaleY),
              });
            }}
          />
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            keepRatio={false}
            boundBoxFunc={(_old, next) => (next.width < 20 || next.height < 20 ? _old : next)}
          />
        </Layer>
      </Stage>
    </div>
  );
}
