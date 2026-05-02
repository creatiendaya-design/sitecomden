// components/customizer/CustomizerCanvas.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useBuilderStore } from "./store";
import { MockupImage } from "./canvas/MockupImage";
import { BoundsRect } from "./canvas/BoundsRect";
import { TextLayerNode } from "./canvas/TextLayerNode";
import { InlineTextEditor } from "./canvas/InlineTextEditor";
import type { BuilderProduct } from "./CustomizerLayout";
import type Konva from "konva";

const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });

interface Props {
  product: BuilderProduct;
}

const STAGE_TARGET_W = 600;

export function CustomizerCanvas({ product }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: STAGE_TARGET_W, h: STAGE_TARGET_W });
  const [editing, setEditing] = useState<string | null>(null);
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);

  const template = useBuilderStore((s) => s.template);
  const variantId = useBuilderStore((s) => s.variantId);
  const activeZoneId = useBuilderStore((s) => s.activeZoneId);
  const layers = useBuilderStore((s) => s.getLayersForActiveZone());
  const selectedId = useBuilderStore((s) => s.selectedLayerId);
  const setSelected = useBuilderStore((s) => s.setSelectedLayer);
  const updateLayer = useBuilderStore((s) => s.updateLayer);

  const zone = template?.zones.find((z) => z.id === activeZoneId);

  // Resolve mockup: per-color override OR default zone mockup
  // Variant.options is Record<string, string>, so we look up by axis option NAME match.
  const mockupUrl = (() => {
    if (!zone) return "";
    const overrides = product.mockupOverrides;
    if (!overrides || !variantId) return zone.mockupImage;
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return zone.mockupImage;
    const axisOption = product.options.find((o) => o.id === overrides.axisOptionId);
    if (!axisOption) return zone.mockupImage;
    const variantValueName = variant.options[axisOption.name];
    if (!variantValueName) return zone.mockupImage;
    const matchedValue = axisOption.values.find((v) => v.value === variantValueName);
    if (!matchedValue) return zone.mockupImage;
    return overrides.mockups[zone.id]?.[matchedValue.id] ?? zone.mockupImage;
  })();

  // Detect when fallback to default mockup happens
  const hasOverrideForVariant = (() => {
    if (!zone) return true;
    const overrides = product.mockupOverrides;
    if (!overrides || !variantId) return true;
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return true;
    const axisOption = product.options.find((o) => o.id === overrides.axisOptionId);
    if (!axisOption) return true;
    const variantValueName = variant.options[axisOption.name];
    if (!variantValueName) return true;
    const matchedValue = axisOption.values.find((v) => v.value === variantValueName);
    if (!matchedValue) return true;
    return Boolean(overrides.mockups[zone.id]?.[matchedValue.id]);
  })();

  useEffect(() => {
    if (!containerRef.current) return;
    const w = Math.min(STAGE_TARGET_W, containerRef.current.offsetWidth - 32);
    setSize({ w, h: w });
  }, []);

  useEffect(() => {
    if (stageRef.current) setStageRect(stageRef.current.getBoundingClientRect());
  }, [size]);

  if (!zone || !template) return null;
  const editingLayer = layers.find((l) => l.id === editing);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center w-full h-full p-4">
      <div ref={stageRef} className="border rounded-lg shadow-sm bg-white">
        <Stage
          width={size.w}
          height={size.h}
          onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
            // Click on empty stage deselects
            if (e.target === e.target.getStage()) setSelected(null);
          }}
        >
          <Layer>
            <MockupImage src={mockupUrl} width={size.w} height={size.h} />
            <BoundsRect bounds={zone.bounds} stageWidth={size.w} stageHeight={size.h} />
            {layers.map((layer) => (
              <TextLayerNode
                key={layer.id}
                layer={layer}
                selected={selectedId === layer.id && editing !== layer.id}
                stageWidth={size.w}
                stageHeight={size.h}
                onSelect={() => setSelected(layer.id)}
                onChange={(patch) => updateLayer(layer.id, patch)}
                onDoubleClick={() => setEditing(layer.id)}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {!hasOverrideForVariant && variantId && (
        <p className="text-xs text-muted-foreground mt-2">
          Vista previa sobre mockup base · se imprimirá sobre la variante seleccionada
        </p>
      )}

      {editingLayer && stageRect && (
        <InlineTextEditor
          layer={editingLayer}
          stageWidth={size.w}
          stageHeight={size.h}
          stageRect={stageRect}
          maxChars={template.maxCharsPerLayer}
          onChange={(text) => updateLayer(editingLayer.id, { text })}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
