"use client";

import { useEffect } from "react";

interface DynamicFaviconProps {
  faviconUrl?: string | null;
}

export default function DynamicFavicon({ faviconUrl }: DynamicFaviconProps) {
  useEffect(() => {
    if (!faviconUrl) return;

    // Buscar o crear el elemento link del favicon
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    // Actualizar el href
    link.href = faviconUrl;

    // También actualizar apple-touch-icon si existe
    const appleTouchIcon = document.querySelector(
      "link[rel='apple-touch-icon']"
    ) as HTMLLinkElement;
    
    if (appleTouchIcon) {
      appleTouchIcon.href = faviconUrl;
    }
  }, [faviconUrl]);

  return null;
}