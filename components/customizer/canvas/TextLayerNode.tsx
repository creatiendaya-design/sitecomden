// components/customizer/canvas/TextLayerNode.tsx
"use client";

import { useEffect, useRef } from "react";
import { Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { TextLayer, BoundsPct } from "@/lib/customizer/types";

interface Props {
  layer: TextLayer;
  selected: boolean;
  stageWidth: number;
  stageHeight: number;
  bounds: BoundsPct;
  onSelect: () => void;
  onChange: (patch: Partial<TextLayer>) => void;
  onDoubleClick: () => void;
}

export function TextLayerNode({
  layer,
  selected,
  stageWidth,
  stageHeight,
  bounds,
  onSelect,
  onChange,
  onDoubleClick,
}: Props) {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selected && textRef.current && trRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  const xPx = (layer.x / 100) * stageWidth;
  const yPx = (layer.y / 100) * stageHeight;

  // Print-area bounds in pixels (the dotted cyan rectangle from BoundsRect)
  const bxPx = (bounds.xPct / 100) * stageWidth;
  const byPx = (bounds.yPct / 100) * stageHeight;
  const bwPx = (bounds.widthPct / 100) * stageWidth;
  const bhPx = (bounds.heightPct / 100) * stageHeight;

  return (
    <>
      <Text
        ref={textRef}
        text={layer.text}
        x={xPx}
        y={yPx}
        fontSize={layer.size}
        fontFamily={layer.font}
        fill={layer.color}
        letterSpacing={layer.letterSpacing}
        rotation={layer.rotation}
        align={layer.align}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        dragBoundFunc={(pos) => {
          const node = textRef.current;
          if (!node) return pos;
          const w = node.width() * node.scaleX();
          const h = node.height() * node.scaleY();
          const maxX = bxPx + Math.max(0, bwPx - w);
          const maxY = byPx + Math.max(0, bhPx - h);
          return {
            x: Math.max(bxPx, Math.min(maxX, pos.x)),
            y: Math.max(byPx, Math.min(maxY, pos.y)),
          };
        }}
        onDragEnd={(e) => {
          const node = e.target;
          onChange({
            x: (node.x() / stageWidth) * 100,
            y: (node.y() / stageHeight) * 100,
          });
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: (node.x() / stageWidth) * 100,
            y: (node.y() / stageHeight) * 100,
            size: Math.max(8, Math.min(200, layer.size * Math.max(scaleX, scaleY))),
            rotation: node.rotation(),
          });
        }}
      />
      {selected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 10 || newBox.height < 10) return oldBox;
            // Reject any resize that would push the text outside the print-area
            // bounds. Compares the new bounding box (in stage coords) against
            // the bounds rectangle in pixels.
            if (newBox.x < bxPx - 0.5) return oldBox;
            if (newBox.y < byPx - 0.5) return oldBox;
            if (newBox.x + newBox.width > bxPx + bwPx + 0.5) return oldBox;
            if (newBox.y + newBox.height > byPx + bhPx + 0.5) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}
