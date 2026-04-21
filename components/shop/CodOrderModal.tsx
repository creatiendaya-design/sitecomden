"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import LocationSelector from "@/components/shop/LocationSelector";
import { createCodOrder } from "@/actions/cod-orders";
import type { CodFormSettings } from "@/lib/types/cod-form";

export interface CodOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
  price: number;
  image?: string;
}

interface CodOrderModalProps {
  open: boolean;
  onClose: () => void;
  items: CodOrderItem[];
  settings: CodFormSettings;
}

interface LocationState {
  departmentId: string;
  provinceId: string;
  districtCode: string;
  departmentName: string;
  provinceName: string;
  districtName: string;
}

function buildWhatsAppUrl(
  settings: CodFormSettings,
  formData: Record<string, string>,
  location: LocationState,
  total: number,
  productNames: string
): string {
  const msg = (settings.whatsappMessage ?? "")
    .replace("{nombre}", formData.name ?? "")
    .replace("{telefono}", formData.phone ?? "")
    .replace("{email}", formData.email ?? "")
    .replace("{direccion}", formData.address ?? "")
    .replace("{distrito}", location.districtName)
    .replace("{total}", total.toFixed(2))
    .replace("{producto}", productNames);
  return `https://wa.me/${(settings.whatsappNumber ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

export default function CodOrderModal({
  open,
  onClose,
  items,
  settings,
}: CodOrderModalProps) {
  const [step, setStep] = useState<"form" | "thanks">("form");
  const [isPending, startTransition] = useTransition();
  const [location, setLocation] = useState<LocationState>({
    departmentId: "",
    provinceId: "",
    districtCode: "",
    departmentName: "",
    provinceName: "",
    districtName: "",
  });
  const [formData, setFormData] = useState<Record<string, string>>({});

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const visibleFields = settings.fields.filter((f) => f.visible);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const field of visibleFields) {
      if (field.id === "location") continue;
      if (field.required && !formData[field.id]) {
        toast.error(`El campo "${field.label}" es requerido`);
        return;
      }
    }
    const locationField = visibleFields.find((f) => f.id === "location");
    if (locationField?.required && !location.districtCode) {
      toast.error("Selecciona tu distrito");
      return;
    }

    startTransition(async () => {
      const payload = {
        items: items.map(({ productId, variantId, quantity }) => ({
          productId,
          variantId,
          quantity,
        })),
        name: formData.name ?? "",
        phone: formData.phone ?? "",
        email: formData.email,
        dni: formData.dni,
        address: formData.address ?? "",
        notes: formData.notes,
        ...location,
      };

      const result = await createCodOrder(payload);
      if (result.success) {
        if (settings.whatsappEnabled && settings.whatsappNumber) {
          window.open(
            buildWhatsAppUrl(
              settings,
              formData,
              location,
              total,
              items.map((i) => i.name).join(", ")
            ),
            "_blank"
          );
        }
        setStep("thanks");
      } else {
        toast.error(result.error ?? "Error al crear el pedido");
      }
    });
  };

  const handleClose = () => {
    setStep("form");
    setFormData({});
    setLocation({
      departmentId: "",
      provinceId: "",
      districtCode: "",
      departmentName: "",
      provinceName: "",
      districtName: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>{settings.formTitle}</DialogTitle>
              {settings.formSubtitle && (
                <p className="text-sm text-muted-foreground">{settings.formSubtitle}</p>
              )}
            </DialogHeader>

            {/* Order summary */}
            <div className="space-y-1.5 border rounded-lg p-3 bg-muted/30">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="truncate pr-2">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="font-semibold shrink-0">
                    S/ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1.5 border-t text-sm">
                <span>Total</span>
                <span className="text-red-600">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {visibleFields.map((field) => {
                if (field.id === "location") {
                  return (
                    <div key="location">
                      <Label className="text-sm">
                        {field.label}
                        {field.required && " *"}
                      </Label>
                      <LocationSelector
                        value={{
                          departmentId: location.departmentId,
                          provinceId: location.provinceId,
                          districtCode: location.districtCode,
                        }}
                        onChange={setLocation}
                      />
                    </div>
                  );
                }
                if (field.id === "notes") {
                  return (
                    <div key="notes">
                      <Label className="text-sm">
                        {field.label}
                        {field.required && " *"}
                      </Label>
                      <Textarea
                        value={formData.notes ?? ""}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={2}
                        required={field.required}
                      />
                    </div>
                  );
                }
                return (
                  <div key={field.id}>
                    <Label className="text-sm">
                      {field.label}
                      {field.required && " *"}
                    </Label>
                    <Input
                      type={
                        field.id === "email"
                          ? "email"
                          : field.id === "phone"
                          ? "tel"
                          : "text"
                      }
                      value={formData[field.id] ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.id]: e.target.value })
                      }
                      required={field.required}
                    />
                  </div>
                );
              })}

              {settings.paymentBadge && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-sm text-green-800">
                  {settings.paymentBadge}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {isPending ? "Procesando..." : settings.buttonText}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                🔒 Datos seguros • Sin tarjeta requerida
              </p>
            </form>
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">{settings.thankYouTitle}</h2>
            <p className="text-muted-foreground text-sm">{settings.thankYouMessage}</p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
