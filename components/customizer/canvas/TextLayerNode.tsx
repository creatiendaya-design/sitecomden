// components/customizer/canvas/TextLayerNode.tsx
"use client";

import { useEffect, useRef } from "react";
import { Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { TextLayer } from "@/lib/customizer/types";

interface Props {
  layer: TextLayer;
  selected: boolean;
  stageWidth: number;
  stageHeight: number;
  onSelect: () => void;
  onChange: (patch: Partial<TextLayer>) => void;
  onDoubleClick: () => void;
}

export function TextLayerNode({
  layer,
  selected,
  stageWidth,
  stageHeight,
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
          boundBoxFunc={(_old, next) => (next.width < 10 ? _old : next)}
        />
      )}
    </>
  );
}
