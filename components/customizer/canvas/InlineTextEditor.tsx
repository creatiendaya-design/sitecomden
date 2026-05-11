// components/customizer/canvas/InlineTextEditor.tsx
"use client";

import { useEffect, useRef } from "react";
import type { TextLayer } from "@/lib/customizer/types";

interface Props {
  layer: TextLayer;
  stageWidth: number;
  stageHeight: number;
  stageRect: DOMRect;
  maxChars: number;
  onChange: (text: string) => void;
  onClose: () => void;
}

export function InlineTextEditor({
  layer,
  stageWidth,
  stageHeight,
  stageRect,
  maxChars,
  onChange,
  onClose,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const xPx = (layer.x / 100) * stageWidth + stageRect.left;
  const yPx = (layer.y / 100) * stageHeight + stageRect.top;

  return (
    <textarea
      ref={ref}
      value={layer.text}
      onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
          e.preventDefault();
          onClose();
        }
      }}
      style={{
        position: "fixed",
        left: xPx,
        top: yPx,
        fontSize: layer.size,
        fontFamily: layer.font,
        color: layer.color,
        textAlign: layer.align,
        background: "transparent",
        border: "1px solid #06b6d4",
        outline: "none",
        resize: "none",
        padding: 4,
        zIndex: 50,
        minWidth: 100,
      }}
    />
  );
}
