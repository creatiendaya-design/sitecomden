// components/customizer/RightSidebar/CustomColorPicker.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pipette } from "lucide-react";

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperConstructor {
  new (): { open: () => Promise<EyeDropperResult> };
}

export function CustomColorPicker({ value, onChange }: Props) {
  const [hex, setHex] = useState(value);
  const valid = HEX_RE.test(hex);

  const supportsEyedropper =
    typeof window !== "undefined" &&
    typeof (window as unknown as { EyeDropper?: EyeDropperConstructor })
      .EyeDropper !== "undefined";

  const handleEyedropper = async () => {
    const ED = (window as unknown as { EyeDropper?: EyeDropperConstructor })
      .EyeDropper;
    if (!ED) return;
    try {
      const eye = new ED();
      const res = await eye.open();
      if (res?.sRGBHex) {
        setHex(res.sRGBHex);
        onChange(res.sRGBHex);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="color"
          value={valid ? hex : "#000000"}
          onChange={(e) => {
            setHex(e.target.value);
            onChange(e.target.value);
          }}
          className="size-10 rounded cursor-pointer"
        />
        <Input
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            if (HEX_RE.test(e.target.value)) onChange(e.target.value);
          }}
          placeholder="#RRGGBB"
          className="font-mono"
        />
        {supportsEyedropper && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleEyedropper}
            title="Eyedropper"
          >
            <Pipette className="size-4" />
          </Button>
        )}
      </div>
      {!valid && <p className="text-xs text-red-600">Formato: #RRGGBB</p>}
    </div>
  );
}
