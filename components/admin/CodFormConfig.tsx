"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CodFormSettings, CodFormField } from "@/lib/types/cod-form";

function SortableField({
  field,
  onChange,
}: {
  field: CodFormField;
  onChange: (f: CodFormField) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border text-sm"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="flex-1 font-medium truncate">{field.label}</span>
      <button
        type="button"
        onClick={() => onChange({ ...field, required: !field.required })}
        className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 transition-colors ${
          field.required
            ? "bg-green-100 text-green-700 border-green-300"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {field.required ? "Requerido" : "Opcional"}
      </button>
      <button
        type="button"
        onClick={() => onChange({ ...field, visible: !field.visible })}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        {field.visible ? (
          <Eye className="h-4 w-4 text-blue-500" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

interface CodFormConfigProps {
  settings: CodFormSettings;
  onChange: (settings: CodFormSettings) => void;
}

export default function CodFormConfig({ settings, onChange }: CodFormConfigProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  const update = <K extends keyof CodFormSettings>(key: K, value: CodFormSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const updateField = (id: string, updated: CodFormField) =>
    onChange({ ...settings, fields: settings.fields.map((f) => (f.id === id ? updated : f)) });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.fields.findIndex((f) => f.id === active.id);
    const newIndex = settings.fields.findIndex((f) => f.id === over.id);
    onChange({ ...settings, fields: arrayMove(settings.fields, oldIndex, newIndex) });
  };

  return (
    <div className="space-y-5 mt-4 border rounded-lg p-4 bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Título del formulario</Label>
          <Input value={settings.formTitle} onChange={(e) => update("formTitle", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Subtítulo</Label>
          <Input
            value={settings.formSubtitle ?? ""}
            onChange={(e) => update("formSubtitle", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Texto del botón</Label>
          <Input
            value={settings.buttonText}
            onChange={(e) => update("buttonText", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Badge de pago</Label>
          <Input
            value={settings.paymentBadge ?? ""}
            onChange={(e) => update("paymentBadge", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Título de agradecimiento</Label>
          <Input
            value={settings.thankYouTitle}
            onChange={(e) => update("thankYouTitle", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Mensaje de agradecimiento</Label>
          <Textarea
            value={settings.thankYouMessage}
            onChange={(e) => update("thankYouMessage", e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          Campos del formulario
        </Label>
        <p className="text-xs text-muted-foreground mb-2">
          Arrastra para reordenar • 👁 visible • oculto
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={settings.fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5">
              {settings.fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  onChange={(f) => updateField(field.id, f)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="border rounded-lg p-3 bg-green-50 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-green-800">
            📱 Enviar a WhatsApp tras confirmar
          </Label>
          <Switch
            checked={settings.whatsappEnabled}
            onCheckedChange={(v) => update("whatsappEnabled", v)}
          />
        </div>
        {settings.whatsappEnabled && (
          <>
            <div>
              <Label className="text-xs">Número WhatsApp (con código de país)</Label>
              <Input
                value={settings.whatsappNumber ?? ""}
                onChange={(e) => update("whatsappNumber", e.target.value)}
                placeholder="+51999999999"
              />
            </div>
            <div>
              <Label className="text-xs">
                Mensaje (variables: {"{nombre}"}, {"{telefono}"}, {"{direccion}"}, {"{total}"},
                {" {producto}"})
              </Label>
              <Textarea
                value={settings.whatsappMessage ?? ""}
                onChange={(e) => update("whatsappMessage", e.target.value)}
                rows={4}
                className="text-xs font-mono"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
