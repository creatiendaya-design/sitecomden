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

interface AddBlockMenuProps {
  onAdd: (type: LandingBlockType) => void;
  disabled?: boolean;
}

const BLOCK_TYPES: LandingBlockType[] = [
  "HERO", "GALLERY", "TESTIMONIALS", "VIDEO", "COLORS", "TICKER", "TRUST_BADGES", "RICH_TEXT", "FAQ", "IMAGE_TEXT", "RELATED_PRODUCTS", "COMPARISON",
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
            {BLOCK_TYPE_LABELS[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
