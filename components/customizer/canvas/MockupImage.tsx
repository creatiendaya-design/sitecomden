// components/customizer/canvas/MockupImage.tsx
"use client";

import { useEffect, useState } from "react";
import { Image as KonvaImage } from "react-konva";

interface Props {
  src: string;
  width: number;
  height: number;
}

export function MockupImage({ src, width, height }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.src = src;
    i.onload = () => setImg(i);
  }, [src]);

  if (!img) return null;
  return <KonvaImage image={img} width={width} height={height} />;
}
