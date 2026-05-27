"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TickerBlockContent, TickerMode } from "@/lib/types/landing-blocks";

interface TickerBlockFormProps {
  content: TickerBlockContent;
  onChange: (content: TickerBlockContent) => void;
}

export default function TickerBlockForm({ content, onChange }: TickerBlockFormProps) {
  const update = <K extends keyof TickerBlockContent>(key: K, value: TickerBlockContent[K]) =>
    onChange({ ...content, [key]: value });

  const showScrolling = content.mode === "scrolling" || content.mode === "both";
  const showCountdown = content.mode === "countdown" || content.mode === "both";

  return (
    <div className="space-y-3">
      <div>
        <Label>Modo</Label>
        <Select value={content.mode} onValueChange={(v) => update("mode", v as TickerMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scrolling">Solo texto scrolling</SelectItem>
            <SelectItem value="countdown">Solo contador regresivo</SelectItem>
            <SelectItem value="both">Texto scrolling + Contador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={content.sticky} onCheckedChange={(v) => update("sticky", v)} />
        <Label>Sticky (fijo en el encabezado)</Label>
      </div>

      {showScrolling && (
        <>
          <div>
            <Label>Texto scrolling</Label>
            <Input
              value={content.scrollingText ?? ""}
              onChange={(e) => update("scrollingText", e.target.value)}
              placeholder="Oferta del día • Envío gratis •"
            />
          </div>
          <div>
            <Label>Velocidad (px/s)</Label>
            <Input
              type="number"
              value={content.speed ?? 30}
              onChange={(e) => update("speed", Number(e.target.value))}
              min={10}
              max={100}
            />
          </div>
        </>
      )}

      {showCountdown && (
        <>
          <div>
            <Label>Etiqueta del contador</Label>
            <Input
              value={content.countdownLabel ?? ""}
              onChange={(e) => update("countdownLabel", e.target.value)}
              placeholder="¡Oferta termina en:"
            />
          </div>
          <div>
            <Label>Fecha/hora de vencimiento</Label>
            <Input
              type="datetime-local"
              value={content.endsAt?.slice(0, 16) ?? ""}
              onChange={(e) => update("endsAt", new Date(e.target.value).toISOString())}
            />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Color de fondo</Label>
          <div className="flex gap-2 mt-1 items-center">
            <input
              type="color"
              value={content.bgColor ?? "#dc2626"}
              onChange={(e) => update("bgColor", e.target.value)}
              className="h-8 w-10 rounded border cursor-pointer p-0.5"
            />
            <Input value={content.bgColor ?? ""} onChange={(e) => update("bgColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Color de texto</Label>
          <div className="flex gap-2 mt-1 items-center">
            <input
              type="color"
              value={content.textColor ?? "#ffffff"}
              onChange={(e) => update("textColor", e.target.value)}
              className="h-8 w-10 rounded border cursor-pointer p-0.5"
            />
            <Input value={content.textColor ?? ""} onChange={(e) => update("textColor", e.target.value)} className="text-xs h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
