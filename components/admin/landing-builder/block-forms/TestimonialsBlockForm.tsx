"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import type { TestimonialsBlockContent, TestimonialItem } from "@/lib/types/landing-blocks";

interface TestimonialsBlockFormProps {
  content: TestimonialsBlockContent;
  onChange: (content: TestimonialsBlockContent) => void;
}

export default function TestimonialsBlockForm({ content, onChange }: TestimonialsBlockFormProps) {
  const updateItem = (index: number, field: keyof TestimonialItem, value: string | number) => {
    const items = content.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange({ ...content, items });
  };

  const addItem = () =>
    onChange({ ...content, items: [...content.items, { name: "", text: "", rating: 5 as const }] });

  const removeItem = (index: number) =>
    onChange({ ...content, items: content.items.filter((_, i) => i !== index) });

  return (
    <div className="space-y-3">
      {content.items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-muted-foreground">Testimonio {i + 1}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Calificación (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={item.rating}
                onChange={(e) => updateItem(i, "rating", Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Testimonio</Label>
            <Textarea value={item.text} onChange={(e) => updateItem(i, "text", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-xs">Foto URL (opcional)</Label>
            <Input value={item.photo ?? ""} onChange={(e) => updateItem(i, "photo", e.target.value)} placeholder="https://..." />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="h-3 w-3 mr-1" /> Agregar testimonio
      </Button>
    </div>
  );
}
