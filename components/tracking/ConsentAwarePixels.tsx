"use client";

import { useState, useEffect } from "react";
import PixelScripts from "./PixelScripts";
import { CONSENT_KEY } from "@/lib/consent";

interface ConsentAwarePixelsProps {
  pixels: Array<{
    platform: string;
    config: any;
    testMode: boolean;
  }>;
  nonce?: string;
}

export default function ConsentAwarePixels({ pixels, nonce }: ConsentAwarePixelsProps) {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const check = () => {
      setHasConsent(localStorage.getItem(CONSENT_KEY) === "all");
    };
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  if (!hasConsent || pixels.length === 0) return null;
  return <PixelScripts pixels={pixels} nonce={nonce} />;
}
