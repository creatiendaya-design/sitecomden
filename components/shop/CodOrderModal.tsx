"use client";

import { useState, useTransition, useEffect } from "react";
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
import type { ButtonStyle } from "@/lib/cod-forms/types";
import { resolveTemplateVariables } from "@/lib/cod-forms/template-variables";
import SubmitButtonBlock from "@/components/shop/cod-form/blocks/SubmitButtonBlock";
import { useTracking } from "@/hooks/useTracking";

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
  buttonStyle?: ButtonStyle | null;
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
  productNames: string,
  orderId: string
): string {
  const msg = resolveTemplateVariables(settings.whatsappMessage ?? "", {
    nombre: formData.name ?? "",
    telefono: formData.phone ?? "",
    direccion: formData.address ?? "",
    referencia: formData.reference ?? "",
    distrito: location.districtName,
    total: total.toFixed(2),
    producto: productNames,
    pedido: orderId,
  });
  return `https://wa.me/${(settings.whatsappNumber ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

export default function CodOrderModal({
  open,
  onClose,
  items,
  settings,
  buttonStyle,
}: CodOrderModalProps) {
  const [step, setStep] = useState<"form" | "thanks">("form");
  const [isPending, startTransition] = useTransition();
  const { trackEvent } = useTracking();

  useEffect(() => {
    if (open) {
      trackEvent("InitiateCheckout", {
        value: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        currency: "PEN",
        num_items: items.reduce((sum, i) => sum + i.quantity, 0),
        content_ids: items.map((i) => i.productId),
        contents: items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.price })),
      });
    }
  }, [open]);
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
        reference: formData.reference,
        notes: formData.notes,
        ...location,
      };

      const result = await createCodOrder(payload);
      if (result.success) {
        trackEvent("Purchase", {
          value: total,
          currency: "PEN",
          transaction_id: result.orderId,
          num_items: items.reduce((sum, i) => sum + i.quantity, 0),
          content_ids: items.map((i) => i.productId),
          contents: items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.price })),
        });

        if (settings.whatsappEnabled && settings.whatsappNumber) {
          window.open(
            buildWhatsAppUrl(
              settings,
              formData,
              location,
              total,
              items.map((i) => i.name).join(", "),
              result.formattedNumber ?? result.orderId ?? ""
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>{settings.formTitle}</DialogTitle>
              {settings.formSubtitle && (
                <p className="text-sm text-muted-foreground">{settings.formSubtitle}</p>
              )}
            </DialogHeader>

            {/* Order summary */}
            <div className="space-y-1.5 border rounded-lg p-3 bg-muted/30 min-w-0">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm min-w-0">
                  <span className="truncate min-w-0">
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
                        allowedDepartmentIds={
                          settings.shippingRestriction?.enabled
                            ? settings.shippingRestriction.allowedDepartmentIds
                            : undefined
                        }
                        allowedProvinceIds={
                          settings.shippingRestriction?.enabled
                            ? settings.shippingRestriction.allowedProvinceIds
                            : undefined
                        }
                        allowedDistrictCodes={
                          settings.shippingRestriction?.enabled
                            ? settings.shippingRestriction.allowedDistrictCodes
                            : undefined
                        }
                        restrictionMessage={
                          settings.shippingRestriction?.enabled
                            ? settings.shippingRestriction.restrictionMessage
                            : undefined
                        }
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
                      type={field.id === "email" ? "email" : "text"}
                      inputMode={
                        field.id === "phone" || field.id === "dni"
                          ? "numeric"
                          : field.id === "email"
                          ? "email"
                          : undefined
                      }
                      maxLength={
                        field.id === "phone"
                          ? 9
                          : field.id === "dni"
                          ? 8
                          : undefined
                      }
                      value={formData[field.id] ?? ""}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (field.id === "phone") {
                          val = val.replace(/\D/g, "").slice(0, 9);
                        } else if (field.id === "dni") {
                          val = val.replace(/\D/g, "").slice(0, 8);
                        }
                        setFormData({ ...formData, [field.id]: val });
                      }}
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

              {(() => {
                const productNames = items.map((i) => i.name).join(", ");
                const resolvedText = isPending
                  ? "Procesando..."
                  : resolveTemplateVariables(settings.buttonText, {
                      total: total.toFixed(2),
                      producto: productNames,
                    });
                return buttonStyle ? (
                  <SubmitButtonBlock
                    text={resolvedText}
                    style={buttonStyle}
                    disabled={isPending}
                  />
                ) : (
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                  >
                    {resolvedText}
                  </button>
                );
              })()}
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
