"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { BenefitsBlockContent, BenefitCard } from "@/lib/types/landing-blocks";

interface BenefitsBlockFormProps {
  content: BenefitsBlockContent;
  onChange: (content: BenefitsBlockContent) => void;
}

export default function BenefitsBlockForm({ content, onChange }: BenefitsBlockFormProps) {
  const updateCard = (index: number, field: keyof BenefitCard, value: string) => {
    const cards = content.cards.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    );
    onChange({ ...content, cards });
  };

  const addCard = () =>
    onChange({ ...content, cards: [...content.cards, { icon: "✅", title: "", description: "" }] });

  const removeCard = (index: number) =>
    onChange({ ...content, cards: content.cards.filter((_, i) => i !== index) });

  return (
    <div className="space-y-3">
      {content.cards.map((card, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">Card {i + 1}</span>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCard(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Ícono</Label>
              <Input value={card.icon} onChange={(e) => updateCard(i, "icon", e.target.value)} className="text-center text-lg" />
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Título</Label>
              <Input value={card.title} onChange={(e) => updateCard(i, "title", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descripción</Label>
            <Input value={card.description} onChange={(e) => updateCard(i, "description", e.target.value)} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addCard} className="w-full">
        <Plus className="h-3 w-3 mr-1" /> Agregar card
      </Button>
    </div>
  );
}
