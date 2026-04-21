"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Eye, EyeOff, Loader2 } from "lucide-react";
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
import type { CodFormSettings, CodFormField, ShippingRestriction } from "@/lib/types/cod-form";
import { getDepartments, getProvincesByDepartment, getDistrictsByProvince } from "@/actions/locations";

const EMPTY_RESTRICTION: ShippingRestriction = {
  enabled: false,
  allowedDepartmentIds: [],
  allowedProvinceIds: [],
  allowedDistrictCodes: [],
  restrictionMessage: "",
};

function ShippingRestrictionConfig({
  restriction,
  onChange,
}: {
  restriction: ShippingRestriction;
  onChange: (r: ShippingRestriction) => void;
}) {
  const [allDepts, setAllDepts] = useState<{ id: string; name: string }[]>([]);
  const [allProvs, setAllProvs] = useState<{ id: string; name: string }[]>([]);
  const [allDists, setAllDists] = useState<{ code: string; name: string }[]>([]);
  const [loadingProvs, setLoadingProvs] = useState(false);
  const [loadingDists, setLoadingDists] = useState(false);

  useEffect(() => {
    getDepartments().then((r) => { if (r.success) setAllDepts(r.data); });
  }, []);

  useEffect(() => {
    if (!restriction.allowedDepartmentIds.length) {
      setAllProvs([]);
      setAllDists([]);
      return;
    }
    setLoadingProvs(true);
    Promise.all(restriction.allowedDepartmentIds.map((id) => getProvincesByDepartment(id)))
      .then((results) => {
        setAllProvs(results.flatMap((r) => (r.success ? r.data : [])));
        setLoadingProvs(false);
      });
  }, [restriction.allowedDepartmentIds.join(",")]);

  useEffect(() => {
    if (!restriction.allowedProvinceIds.length) {
      setAllDists([]);
      return;
    }
    setLoadingDists(true);
    Promise.all(restriction.allowedProvinceIds.map((id) => getDistrictsByProvince(id)))
      .then((results) => {
        setAllDists(results.flatMap((r) => (r.success ? r.data : [])));
        setLoadingDists(false);
      });
  }, [restriction.allowedProvinceIds.join(",")]);

  const toggleDept = (id: string) => {
    const newIds = restriction.allowedDepartmentIds.includes(id)
      ? restriction.allowedDepartmentIds.filter((x) => x !== id)
      : [...restriction.allowedDepartmentIds, id];
    onChange({ ...restriction, allowedDepartmentIds: newIds, allowedProvinceIds: [], allowedDistrictCodes: [] });
  };

  const toggleProv = (id: string) => {
    const newIds = restriction.allowedProvinceIds.includes(id)
      ? restriction.allowedProvinceIds.filter((x) => x !== id)
      : [...restriction.allowedProvinceIds, id];
    onChange({ ...restriction, allowedProvinceIds: newIds, allowedDistrictCodes: [] });
  };

  const toggleDist = (code: string) => {
    const newCodes = restriction.allowedDistrictCodes.includes(code)
      ? restriction.allowedDistrictCodes.filter((x) => x !== code)
      : [...restriction.allowedDistrictCodes, code];
    onChange({ ...restriction, allowedDistrictCodes: newCodes });
  };

  return (
    <div className="space-y-3 mt-2">
      <div>
        <Label className="text-xs">Mensaje informativo (opcional)</Label>
        <Input
          value={restriction.restrictionMessage ?? ""}
          onChange={(e) => onChange({ ...restriction, restrictionMessage: e.target.value })}
          placeholder="Solo hacemos envíos a Lima"
          className="text-xs"
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          Se muestra encima del selector de ubicación
        </p>
      </div>

      {/* Departamentos */}
      <div>
        <Label className="text-xs font-semibold">
          Departamentos permitidos
          {restriction.allowedDepartmentIds.length > 0 && (
            <span className="ml-1 text-orange-600">({restriction.allowedDepartmentIds.length} sel.)</span>
          )}
        </Label>
        <p className="text-xs text-muted-foreground mb-1">
          Sin selección = acepta todos los departamentos
        </p>
        <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
          {allDepts.length === 0 ? (
            <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            allDepts.map((dept) => (
              <label key={dept.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                <input
                  type="checkbox"
                  checked={restriction.allowedDepartmentIds.includes(dept.id)}
                  onChange={() => toggleDept(dept.id)}
                  className="rounded"
                />
                {dept.name}
              </label>
            ))
          )}
        </div>
      </div>

      {/* Provincias — solo cuando hay departamentos seleccionados */}
      {restriction.allowedDepartmentIds.length > 0 && (
        <div>
          <Label className="text-xs font-semibold">
            Provincias permitidas (opcional)
            {restriction.allowedProvinceIds.length > 0 && (
              <span className="ml-1 text-orange-600">({restriction.allowedProvinceIds.length} sel.)</span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground mb-1">
            Sin selección = acepta todas las provincias de los deptos. elegidos
          </p>
          <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
            {loadingProvs ? (
              <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              allProvs.map((prov) => (
                <label key={prov.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={restriction.allowedProvinceIds.includes(prov.id)}
                    onChange={() => toggleProv(prov.id)}
                    className="rounded"
                  />
                  {prov.name}
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Distritos — solo cuando hay provincias seleccionadas */}
      {restriction.allowedProvinceIds.length > 0 && (
        <div>
          <Label className="text-xs font-semibold">
            Distritos permitidos (opcional)
            {restriction.allowedDistrictCodes.length > 0 && (
              <span className="ml-1 text-orange-600">({restriction.allowedDistrictCodes.length} sel.)</span>
            )}
          </Label>
          <p className="text-xs text-muted-foreground mb-1">
            Sin selección = acepta todos los distritos de las provincias elegidas
          </p>
          <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
            {loadingDists ? (
              <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : (
              allDists.map((dist) => (
                <label key={dist.code} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={restriction.allowedDistrictCodes.includes(dist.code)}
                    onChange={() => toggleDist(dist.code)}
                    className="rounded"
                  />
                  {dist.name}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
                Mensaje (variables: {"{nombre}"}, {"{telefono}"}, {"{direccion}"}, {"{distrito}"},
                {" {total}"}, {"{producto}"}, {"{pedido}"}, {"{referencia}"})
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

      <div className="border rounded-lg p-3 bg-orange-50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold text-orange-800">
              📍 Restringir cobertura de envío
            </Label>
            <p className="text-xs text-orange-700 mt-0.5">
              Limita qué departamentos, provincias o distritos pueden hacer pedidos
            </p>
          </div>
          <Switch
            checked={settings.shippingRestriction?.enabled ?? false}
            onCheckedChange={(v) =>
              update("shippingRestriction", {
                ...(settings.shippingRestriction ?? EMPTY_RESTRICTION),
                enabled: v,
              })
            }
          />
        </div>
        {settings.shippingRestriction?.enabled && (
          <ShippingRestrictionConfig
            restriction={settings.shippingRestriction}
            onChange={(r) => update("shippingRestriction", r)}
          />
        )}
      </div>
    </div>
  );
}
