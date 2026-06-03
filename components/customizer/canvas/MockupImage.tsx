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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset image synchronously when src changes before async load
    setImg(null);

    const tryLoad = (withCors: boolean) => {
      const i = new window.Image();
      if (withCors) i.crossOrigin = "anonymous";
      i.src = src;
      i.onload = () => setImg(i);
      i.onerror = () => {
        if (withCors) {
          console.warn("[MockupImage] CORS load failed, retrying without crossOrigin:", src);
          tryLoad(false);
        } else {
          console.error("[MockupImage] failed to load mockup:", src);
        }
      };
    };

    tryLoad(true);
  }, [src]);

  if (!img) return null;
  return <KonvaImage image={img} width={width} height={height} />;
}
