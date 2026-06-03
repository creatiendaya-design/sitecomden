"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CONSENT_KEY, type ConsentValue } from "@/lib/consent";
import { Cookie } from "lucide-react";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only localStorage API; must run after mount */
    if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
  }, []);

  const handleConsent = (value: ConsentValue) => {
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(
      new StorageEvent("storage", { key: CONSENT_KEY, newValue: value })
    );
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-lg safe-area-pb">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Usamos cookies propias y de terceros (Facebook, TikTok, Google) para
            mejorar tu experiencia y mostrarte anuncios relevantes.{" "}
            <Link
              href="/privacidad"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Política de privacidad
            </Link>
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConsent("essential")}
          >
            Solo esenciales
          </Button>
          <Button size="sm" onClick={() => handleConsent("all")}>
            Aceptar todo
          </Button>
        </div>
      </div>
    </div>
  );
}
