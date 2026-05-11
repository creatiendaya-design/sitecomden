"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCodOrder } from "@/actions/cod-orders";
import { getShippingOptionsForCodForm } from "@/actions/shipping-checkout";
import CodFormBlockRenderer, {
  type LocationValue,
  type RendererContext,
} from "@/components/shop/cod-form/CodFormBlockRenderer";
import { resolveTemplateVariables } from "@/lib/cod-forms/template-variables";
import { useTracking } from "@/hooks/useTracking";
import type {
  CodFormBlockType,
  CodFormTemplateData,
  FieldContent,
  ShippingRestriction,
} from "@/lib/cod-forms/types";
import type { ShippingOption } from "@/components/shop/cod-form/blocks/ShippingOptionsBlock";

export interface CodOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
  /** Final per-unit price (post all discounts). Used to compute the
   *  amount the customer pays. */
  price: number;
  /** Optional gross per-unit price (pre any discount). When present we
   *  render a separate "Descuento" line in the modal summary so the
   *  customer sees how much they saved before paying. */
  originalUnitPrice?: number;
  image?: string;
  /** Volume promotion to apply server-side. The discount is re-resolved
   *  from the DB; the client only signals which promotion was selected. */
  promotionId?: string;
  /** Subscription opt-in info. Server validates the email + applies the
   *  subscription promotion's discount + subscribes to NewsletterSubscriber. */
  subscriptionOptIn?: { promotionId: string; email: string };
}

interface CodOrderModalProps {
  open: boolean;
  onClose: () => void;
  items: CodOrderItem[];
  template: CodFormTemplateData | null;
  shippingRestriction?: ShippingRestriction | null;
}

const EMPTY_LOCATION: LocationValue = {
  departmentId: "",
  provinceId: "",
  districtCode: "",
  departmentName: "",
  provinceName: "",
  districtName: "",
};

const FIELD_TO_PAYLOAD: Partial<Record<CodFormBlockType, string>> = {
  FIELD_NAME: "name",
  FIELD_PHONE: "phone",
  FIELD_EMAIL: "email",
  FIELD_DNI: "dni",
  FIELD_ADDRESS: "address",
  FIELD_REFERENCE: "reference",
  FIELD_NOTES: "notes",
};

function buildWhatsAppUrl(
  number: string,
  message: string,
  vars: Record<string, string>,
): string {
  const msg = resolveTemplateVariables(message, vars);
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

export default function CodOrderModal({
  open,
  onClose,
  items,
  template,
  shippingRestriction,
}: CodOrderModalProps) {
  const [step, setStep] = useState<"form" | "thanks">("form");
  const [isPending, startTransition] = useTransition();
  const { trackEvent } = useTracking();

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Gross subtotal uses originalUnitPrice when present (fallback to price)
  // so the "Subtotal" line shows what the customer would have paid before
  // any promotion was applied. The difference becomes the "Descuento" line.
  const grossSubtotal = items.reduce(
    (s, i) => s + (i.originalUnitPrice ?? i.price) * i.quantity,
    0
  );
  const netSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount =
    Math.round((grossSubtotal - netSubtotal) * 100) / 100;
  const shippingCost =
    shippingOptions.find((o) => o.id === selectedShippingId)?.price ?? 0;
  const subtotal = grossSubtotal;
  const total = netSubtotal + shippingCost;

  const blocks = template?.blocks ?? [];
  const hasShippingBlock = blocks.some(
    (b) => b.visible && b.type === "SHIPPING_OPTIONS",
  );

  // Track checkout initiation when modal opens.
  useEffect(() => {
    if (!open) return;
    trackEvent("InitiateCheckout", {
      value: subtotal,
      currency: "PEN",
      num_items: items.reduce((s, i) => s + i.quantity, 0),
      content_ids: items.map((i) => i.productId),
      contents: items.map((i) => ({
        id: i.productId,
        quantity: i.quantity,
        item_price: i.price,
      })),
    });
    // We intentionally do not depend on items/subtotal — only fire once per open.
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const templateId = template?.id ?? null;

  // Re-fetch shipping options whenever the district or subtotal changes.
  useEffect(() => {
    if (!hasShippingBlock || !location.districtCode) {
      setShippingOptions([]);
      setSelectedShippingId(null);
      setShippingError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await getShippingOptionsForCodForm(
        location.districtCode,
        subtotal,
        templateId,
      );
      if (cancelled) return;
      if (!res.success) {
        setShippingOptions([]);
        setSelectedShippingId(null);
        setShippingError(res.error ?? "No hay opciones de envío");
        return;
      }
      const opts: ShippingOption[] = res.data.map((r) => ({
        id: r.id,
        label: r.isFree ? `${r.name} (Gratis)` : r.name,
        price: r.finalCost,
      }));
      setShippingOptions(opts);
      setShippingError(null);
      setSelectedShippingId((prev) => {
        if (prev && opts.some((o) => o.id === prev)) return prev;
        return opts[0]?.id ?? null;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [hasShippingBlock, location.districtCode, subtotal, templateId]);

  const productNames = items.map((i) => i.name).join(", ");

  const ctx: RendererContext = useMemo(
    () => ({
      buttonText: isPending
        ? "Procesando..."
        : resolveTemplateVariables(template?.buttonText ?? "Confirmar pedido", {
            total: total.toFixed(2),
            producto: productNames,
          }),
      buttonStyle:
        template?.buttonStyle ?? {
          textColor: "#ffffff",
          fontSize: 16,
          fontWeight: "bold",
          fontStyle: "normal",
          bgColor: "#dc2626",
          borderColor: "#dc2626",
          borderWidth: 0,
          borderRadius: 12,
          shadow: 0,
          animation: "none",
          icon: null,
          subtitle: null,
        },
      cartItems: items.map((i) => ({
        productName: i.name,
        variantName: null,
        quantity: i.quantity,
        unitPrice: i.price,
        thumbnailUrl: i.image ?? null,
      })),
      totals: { subtotal, discount, shipping: shippingCost, total },
      shippingOptions,
      selectedShippingId,
      onShippingSelect: setSelectedShippingId,
      fieldValues: formValues,
      fieldErrors,
      onFieldChange: (type, value) => {
        setFormValues((prev) => ({ ...prev, [type]: value }));
        setFieldErrors((prev) => ({ ...prev, [type]: null }));
      },
      onFieldBlur: (type) => {
        const block = blocks.find((b) => b.type === type);
        if (!block || !block.required) return;
        const value = formValues[type] ?? "";
        if (value.trim()) return;
        const c = block.content as unknown as FieldContent | undefined;
        const msg = c?.errorMessage || `${c?.label ?? "Campo"} es obligatorio`;
        setFieldErrors((prev) => ({ ...prev, [type]: msg }));
      },
      location,
      onLocationChange: setLocation,
      shippingRestriction,
      submitDisabled: isPending,
      onSubmit: handleSubmit,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      template,
      isPending,
      total,
      productNames,
      items,
      subtotal,
      shippingCost,
      shippingOptions,
      selectedShippingId,
      formValues,
      fieldErrors,
      location,
      shippingRestriction,
    ],
  );

  function validate(): boolean {
    if (!template) return false;
    const errors: Record<string, string | null> = {};

    for (const block of blocks) {
      if (!block.visible || !block.required) continue;
      if (block.type === "FIELD_PROVINCE" || block.type === "FIELD_CITY") continue;
      const payloadKey = FIELD_TO_PAYLOAD[block.type];
      if (!payloadKey) continue;
      const value = formValues[block.type] ?? "";
      if (!value.trim()) {
        const c = block.content as unknown as FieldContent | undefined;
        errors[block.type] = c?.errorMessage || `${c?.label ?? "Campo"} es obligatorio`;
      }
    }

    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      return false;
    }

    const locationRequired = blocks.some(
      (b) =>
        b.visible &&
        b.required &&
        (b.type === "FIELD_PROVINCE" || b.type === "FIELD_CITY"),
    );
    if (locationRequired && !location.districtCode) {
      toast.error("Selecciona tu distrito");
      return false;
    }

    if (hasShippingBlock && shippingOptions.length > 0 && !selectedShippingId) {
      toast.error("Selecciona una opción de envío");
      return false;
    }

    return true;
  }

  function handleSubmit() {
    if (!template) return;
    if (!validate()) return;

    startTransition(async () => {
      const payload = {
        items: items.map(({ productId, variantId, quantity, promotionId, subscriptionOptIn }) => ({
          productId,
          variantId,
          quantity,
          promotionId,
          subscriptionOptIn,
        })),
        name: formValues.FIELD_NAME ?? "",
        phone: formValues.FIELD_PHONE ?? "",
        email: formValues.FIELD_EMAIL,
        dni: formValues.FIELD_DNI,
        address: [formValues.FIELD_ADDRESS, formValues.FIELD_ADDRESS_2]
          .filter(Boolean)
          .join(" - "),
        reference: formValues.FIELD_REFERENCE,
        notes: formValues.FIELD_NOTES,
        shippingRateId: selectedShippingId ?? undefined,
        departmentId: location.departmentId || undefined,
        provinceId: location.provinceId || undefined,
        districtCode: location.districtCode || undefined,
        departmentName: location.departmentName || undefined,
        provinceName: location.provinceName || undefined,
        districtName: location.districtName || undefined,
      };

      const result = await createCodOrder(payload);
      if (!result.success) {
        toast.error(result.error ?? "Error al crear el pedido");
        return;
      }

      trackEvent("Purchase", {
        value: total,
        currency: "PEN",
        transaction_id: result.orderId,
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        content_ids: items.map((i) => i.productId),
        contents: items.map((i) => ({
          id: i.productId,
          quantity: i.quantity,
          item_price: i.price,
        })),
      });

      const orderRef = result.formattedNumber ?? result.orderId ?? "";

      // Post-submit action
      if (template.postSubmitAction === "WHATSAPP_REDIRECT" && template.whatsappNumber) {
        window.open(
          buildWhatsAppUrl(
            template.whatsappNumber,
            template.whatsappMessage ?? "",
            {
              nombre: formValues.FIELD_NAME ?? "",
              telefono: formValues.FIELD_PHONE ?? "",
              direccion: formValues.FIELD_ADDRESS ?? "",
              referencia: formValues.FIELD_REFERENCE ?? "",
              distrito: location.districtName,
              total: total.toFixed(2),
              producto: productNames,
              pedido: orderRef,
            },
          ),
          "_blank",
        );
        setStep("thanks");
        return;
      }

      if (template.postSubmitAction === "THANK_YOU_PAGE" && template.thankYouPageSlug) {
        window.location.href = `/${template.thankYouPageSlug}?orderId=${orderRef}`;
        return;
      }

      setStep("thanks");
    });
  }

  function handleClose() {
    setStep("form");
    setFormValues({});
    setFieldErrors({});
    setLocation(EMPTY_LOCATION);
    setShippingOptions([]);
    setSelectedShippingId(null);
    setShippingError(null);
    onClose();
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          className="group fixed inset-0 z-50 overflow-y-auto overflow-x-hidden outline-none"
        >
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
            <div className="relative w-full sm:max-w-md rounded-lg border bg-background shadow-lg p-4 sm:p-6 my-4 sm:my-8 group-data-[state=open]:animate-in group-data-[state=closed]:animate-out group-data-[state=closed]:fade-out-0 group-data-[state=open]:fade-in-0 group-data-[state=closed]:zoom-out-95 group-data-[state=open]:zoom-in-95">
              <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none">
                <XIcon className="h-4 w-4" />
                <span className="sr-only">Cerrar</span>
              </DialogPrimitive.Close>

              {!template ? (
                <div className="text-center py-6 space-y-3">
                  <DialogHeader>
                    <DialogTitle>Formulario no disponible</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Este producto no tiene un formulario de pedido contra entrega configurado.
                  </p>
                </div>
              ) : step === "form" ? (
                <>
                  <DialogHeader className="sr-only">
                    <DialogTitle>Completar pedido</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="space-y-3"
                  >
                    {hasShippingBlock && shippingError && location.districtCode && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        {shippingError}
                      </p>
                    )}
                    <CodFormBlockRenderer blocks={blocks} ctx={ctx} />
                    <p className="text-center text-xs text-muted-foreground">
                      🔒 Datos seguros • Sin tarjeta requerida
                    </p>
                  </form>
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="text-5xl">🎉</div>
                  <h2 className="text-xl font-bold">
                    {template.thankYouTitle ?? "¡Gracias por tu pedido!"}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {template.thankYouMessage ??
                      "Nos comunicaremos contigo en breve para coordinar la entrega."}
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-6 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
