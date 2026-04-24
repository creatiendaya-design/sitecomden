"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { BLOCK_TYPE_LABELS, type LandingBlockType } from "@/lib/types/landing-blocks";

const BLOCK_ICONS: Record<LandingBlockType, string> = {
  HERO: "🖼",
  BENEFITS: "✅",
  GALLERY: "🖼️",
  TESTIMONIALS: "💬",
  VIDEO: "▶️",
  COLORS: "🎨",
  TICKER: "📢",
  TRUST_BADGES: "🛡️",
};

interface AddBlockMenuProps {
  onAdd: (type: LandingBlockType) => void;
  disabled?: boolean;
}

const BLOCK_TYPES: LandingBlockType[] = [
  "HERO", "BENEFITS", "GALLERY", "TESTIMONIALS", "VIDEO", "COLORS", "TICKER", "TRUST_BADGES",
];

export default function AddBlockMenu({ onAdd, disabled }: AddBlockMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" disabled={disabled}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar sección
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {BLOCK_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            <span className="mr-2">{BLOCK_ICONS[type]}</span>
            {BLOCK_TYPE_LABELS[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
