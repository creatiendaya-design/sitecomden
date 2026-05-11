"use client";

import { useState, useEffect, useMemo } from "react";
import ProductOptions from "@/components/shop/ProductOptions";
import AddToCartButton from "@/components/shop/AddToCartButton";
import CodOrderModal from "@/components/shop/CodOrderModal";
import { StartCustomizingButton } from "@/components/shop/StartCustomizingButton";
import VolumeTierSelector from "@/components/shop/promotions/VolumeTierSelector";
import SubscriptionOptIn from "@/components/shop/promotions/SubscriptionOptIn";
import FreeGiftProgress from "@/components/shop/promotions/FreeGiftProgress";
import BundleSuggestion from "@/components/shop/promotions/BundleSuggestion";
import { useCartStore } from "@/store/cart";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CheckoutMode } from "@/lib/types/cod-form";
import type { CodFormTemplateData, ShippingRestriction } from "@/lib/cod-forms/types";
import { getProductImageUrl } from "@/lib/image-utils";
import type { SizeGuideData } from "@/lib/size-guides/types";
import type {
  BundleConfig,
  FreeGiftConfig,
  ProductScopedPromotion,
  SubscriptionConfig,
  VolumeConfig,
} from "@/lib/promotions/types";
import {
  buildTierDisplays,
  computeBundleBreakdown,
  computeFreeGiftProgress,
  computeVolumeBreakdown,
  pickActiveBundlePromotion,
  pickActiveFreeGiftPromotion,
  pickActiveSubscriptionPromotion,
  pickActiveVolumePromotion,
  pickDefaultTierIndex,
} from "@/lib/promotions/storefront";

// 🔧 TIPOS EXPLÍCITOS
interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  sku: string | null;
  stock: number;
  images: any;
  hasVariants: boolean;
  weight: number | null;
  customizableTemplate?: { id: string; surcharge: number | null } | null;
}

interface VariantData {
  id: string;
  productId: string;
  sku: string | null;
  barcode: string | null;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockAlert: number | null;
  weight: number | null;
  image: string | null;
  active: boolean;
}

interface OptionValue {
  id: string;
  value: string;
  position: number;
  swatchType: string;
  colorHex: string | null;
  swatchImage: string | null;
}

interface OptionData {
  id: string;
  name: string;
  displayStyle: string;
  position: number;
  values: OptionValue[];
}

interface ProductActionsProps {
  product: ProductData;
  variants: VariantData[];
  options: OptionData[];
  checkoutMode?: CheckoutMode;
  codFormTemplate?: CodFormTemplateData | null;
  shippingRestriction?: ShippingRestriction | null;
  sizeGuide?: SizeGuideData | null;
  promotions?: ProductScopedPromotion[];
}

export default function ProductActions({
  product,
  variants,
  options,
  checkoutMode,
  codFormTemplate,
  shippingRestriction,
  sizeGuide,
  promotions = [],
}: ProductActionsProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<VariantData | null>(null);
  const [codOpen, setCodOpen] = useState(false);

  const mode: CheckoutMode = checkoutMode ?? "STANDARD";

  // Active VOLUME promotion (if any). Computed once per render — cheap.
  const volumePromotion = useMemo(
    () => pickActiveVolumePromotion(promotions),
    [promotions]
  );
  const volumeConfig: VolumeConfig | null = volumePromotion
    ? (volumePromotion.config as VolumeConfig)
    : null;

  // Unit price drives all tier math. Falls back to base price until the
  // shopper picks a variant.
  const unitPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product.basePrice);

  const tierDisplays = useMemo(
    () => (volumeConfig ? buildTierDisplays(unitPrice, volumeConfig) : []),
    [volumeConfig, unitPrice]
  );

  const [selectedTierIndex, setSelectedTierIndex] = useState<number>(0);

  // Reset selection to the recommended default whenever the active promo or
  // the unit price changes (variant swap, promo edit by admin, etc.).
  useEffect(() => {
    if (tierDisplays.length === 0) {
      setSelectedTierIndex(0);
      return;
    }
    setSelectedTierIndex(pickDefaultTierIndex(tierDisplays));
  }, [tierDisplays]);

  const selectedTier = tierDisplays[selectedTierIndex] ?? null;
  const selectedQty = selectedTier?.qty ?? 1;

  const breakdown =
    volumeConfig && selectedQty > 1
      ? computeVolumeBreakdown(selectedQty, unitPrice, volumeConfig)
      : null;

  // Active SUBSCRIPTION promotion. Independent of volume — they stack.
  const subscriptionPromotion = useMemo(
    () => pickActiveSubscriptionPromotion(promotions),
    [promotions]
  );
  const subscriptionConfig: SubscriptionConfig | null = subscriptionPromotion
    ? (subscriptionPromotion.config as SubscriptionConfig)
    : null;

  const [subscribeOptedIn, setSubscribeOptedIn] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeVerified, setSubscribeVerified] = useState(false);

  // Active FREE_GIFT promotion. Progress shown as long as a promotion exists,
  // even before the threshold is met (acts as upsell nudge).
  const freeGiftPromotion = useMemo(
    () => pickActiveFreeGiftPromotion(promotions),
    [promotions]
  );
  const freeGiftConfig: FreeGiftConfig | null = freeGiftPromotion
    ? (freeGiftPromotion.config as FreeGiftConfig)
    : null;

  // Use the line subtotal (qty × unit) as the proxy for "what the customer is
  // about to spend on this product." Cart-level totals are evaluated later by
  // the server when the order is created.
  const freeGiftProgressData = useMemo(() => {
    if (!freeGiftConfig) return null;
    const lineSubtotal = breakdown
      ? breakdown.total
      : unitPrice * Math.max(1, selectedQty);
    return computeFreeGiftProgress(lineSubtotal, freeGiftConfig);
  }, [freeGiftConfig, breakdown, unitPrice, selectedQty]);

  // Active BUNDLE promotion + breakdown computed against current product
  // base price + partner products' base prices.
  const bundlePromotion = useMemo(
    () => pickActiveBundlePromotion(promotions),
    [promotions]
  );
  const bundleConfig: BundleConfig | null = bundlePromotion
    ? (bundlePromotion.config as BundleConfig)
    : null;
  const bundleBreakdown = useMemo(() => {
    if (!bundleConfig || !bundlePromotion?.bundlePartnerProducts?.length) {
      return null;
    }
    return computeBundleBreakdown({
      config: bundleConfig,
      anchor: {
        productId: product.id,
        name: product.name,
        image: getProductImageUrl(product.images),
        unitPrice: Number(product.basePrice),
      },
      partners: bundlePromotion.bundlePartnerProducts.map((p) => ({
        productId: p.id,
        name: p.name,
        image: p.image,
        unitPrice: p.basePrice,
      })),
    });
  }, [bundleConfig, bundlePromotion, product]);

  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const [bundleAdding, setBundleAdding] = useState(false);

  const handleAddBundle = async () => {
    if (!bundleBreakdown || !bundlePromotion) return;
    setBundleAdding(true);
    try {
      let added = 0;
      for (const line of bundleBreakdown.lines) {
        const isAnchor = line.productId === product.id;
        const ok = addItem(
          {
            id: line.productId,
            productId: line.productId,
            slug: isAnchor ? product.slug : line.productId,
            name: line.name,
            price: line.finalUnitPrice,
            image: line.image ?? undefined,
            maxStock: 999,
            appliedPromotion: {
              promotionId: bundlePromotion.id,
              type: "BUNDLE",
              tierLabel: bundlePromotion.name,
              discountPerUnit: line.discountPerUnit,
              originalUnitPrice: line.unitPrice,
            },
          },
          1
        );
        if (ok) added += 1;
      }
      if (added > 0) {
        toast.success(`Combo agregado al carrito (${added} productos)`);
        router.push("/carrito");
      } else {
        toast.error("No se pudo agregar el combo");
      }
    } finally {
      setBundleAdding(false);
    }
  };

  // Compute subscription discount per unit when opted in AND verified.
  // The discount is gated on `subscribeVerified` so we never expose savings
  // to the cart before the customer completes the double opt-in code flow.
  const subscriptionDiscountPerUnit = useMemo(() => {
    if (!subscribeOptedIn || !subscriptionConfig) return 0;
    if (!subscribeVerified) return 0;
    const trimmed = subscribeEmail.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!isValid) return 0;
    // Subscription applies on top of the volume-discounted unit price so the
    // savings reflect what the customer will actually see in the cart.
    const baseAfterVolume = breakdown
      ? unitPrice - breakdown.discountPerUnit
      : unitPrice;
    if (subscriptionConfig.discountType === "PERCENT") {
      return (
        Math.round(
          ((baseAfterVolume * subscriptionConfig.discountValue) / 100) * 100
        ) / 100
      );
    }
    return Math.round(Math.min(subscriptionConfig.discountValue, baseAfterVolume) * 100) / 100;
  }, [subscribeOptedIn, subscribeEmail, subscribeVerified, subscriptionConfig, breakdown, unitPrice]);

  // 🆕 Manejar cambio de opción
  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: valueId,
    }));
  };

  // 🆕 Encontrar variante que coincida con las opciones seleccionadas
  useEffect(() => {
    // Si no todas las opciones están seleccionadas, no buscar
    if (Object.keys(selectedOptions).length !== options.length) {
      setSelectedVariant(null);
      
      // 🆕 Resetear imagen de variante si no hay variante seleccionada
      window.dispatchEvent(
        new CustomEvent("variant-image-changed", {
          detail: { imageUrl: null },
        })
      );
      
      return;
    }

    // Construir objeto de opciones seleccionadas { "Color": "Rojo", "Talla": "M" }
    const selectedOptionsMap: Record<string, string> = {};

    options.forEach((option) => {
      const selectedValueId = selectedOptions[option.id];
      const selectedValue = option.values.find((v) => v.id === selectedValueId);
      if (selectedValue) {
        selectedOptionsMap[option.name] = selectedValue.value;
      }
    });

    // Buscar variante que coincida
    const matchingVariant = variants.find((variant) => {
      return Object.keys(selectedOptionsMap).every((optionName) => {
        return variant.options[optionName] === selectedOptionsMap[optionName];
      });
    });

    setSelectedVariant(matchingVariant || null);
  }, [selectedOptions, options, variants]);

  // ✅ Notificar cambio de precio y/o imagen cuando cambie la variante
  useEffect(() => {
    if (selectedVariant) {


      // Actualizar precio
      window.dispatchEvent(
        new CustomEvent("variant-changed", {
          detail: {
            price: Number(selectedVariant.price),
            compareAtPrice: selectedVariant.compareAtPrice
              ? Number(selectedVariant.compareAtPrice)
              : null,
          },
        })
      );

      // 🆕 Actualizar imagen (o resetear si no tiene)
      window.dispatchEvent(
        new CustomEvent("variant-image-changed", {
          detail: {
            imageUrl: selectedVariant.image, // Puede ser string o null
          },
        })
      );
    }
  }, [selectedVariant]);

  // Calcular stock total
  const totalStock = product.hasVariants
    ? variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock;

  const inStock = totalStock > 0;

  return (
    <div className="space-y-6">
      {/* 🆕 Opciones con Swatches */}
      {product.hasVariants && options.length > 0 && (
        <ProductOptions
          options={options}
          selectedOptions={selectedOptions}
          onOptionChange={handleOptionChange}
          sizeGuide={sizeGuide}
        />
      )}

      {/* Selector de descuento por volumen */}
      {volumeConfig && tierDisplays.length > 0 && inStock && (
        <VolumeTierSelector
          tiers={tierDisplays}
          selectedIndex={selectedTierIndex}
          onSelect={setSelectedTierIndex}
          summary={
            breakdown && breakdown.totalDiscount > 0
              ? {
                  subtotal: breakdown.subtotal,
                  discount: breakdown.totalDiscount,
                  total: breakdown.total,
                }
              : null
          }
          title={volumePromotion?.name ?? "Elige tu pack"}
        />
      )}

      {/* Suscripción al newsletter */}
      {subscriptionConfig && inStock && (
        <SubscriptionOptIn
          config={subscriptionConfig}
          unitPrice={
            breakdown ? unitPrice - breakdown.discountPerUnit : unitPrice
          }
          optedIn={subscribeOptedIn}
          email={subscribeEmail}
          onToggle={setSubscribeOptedIn}
          onEmailChange={setSubscribeEmail}
          onVerifiedChange={setSubscribeVerified}
        />
      )}

      {/* Regalo gratis al alcanzar monto */}
      {freeGiftConfig && freeGiftProgressData && inStock && (
        <FreeGiftProgress
          giftProduct={freeGiftPromotion?.freeGiftProduct ?? null}
          progress={freeGiftProgressData}
        />
      )}

      {/* Combo / Bundle */}
      {bundleBreakdown && bundlePromotion && inStock && (
        <BundleSuggestion
          promotionName={bundlePromotion.name}
          breakdown={bundleBreakdown}
          onAddBundle={handleAddBundle}
          loading={bundleAdding}
        />
      )}

      {/* 🆕 Información de la Variante Seleccionada */}
      {selectedVariant && (
        <div className="rounded-lg bg-slate-50 p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">SKU:</span>
            <span className="font-medium">{selectedVariant.sku}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Precio:</span>
            <span className="text-xl font-bold text-blue-600">
              S/ {selectedVariant.price.toFixed(2)}
            </span>
          </div>
          {selectedVariant.compareAtPrice && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600">Antes:</span>
              <span className="text-sm text-slate-500 line-through">
                S/ {selectedVariant.compareAtPrice.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Disponibilidad:</span>
            <span
              className={`font-medium ${
                selectedVariant.stock > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {selectedVariant.stock > 0
                ? `${selectedVariant.stock} en stock`
                : "Sin stock"}
            </span>
          </div>
        </div>
      )}

      {/* Checkout mode buttons */}
      <div className="space-y-2">
        {product.customizableTemplate ? (
          <StartCustomizingButton
            productSlug={product.slug}
            variantId={selectedVariant?.id ?? null}
            surcharge={product.customizableTemplate.surcharge}
            basePrice={selectedVariant ? Number(selectedVariant.price) : Number(product.basePrice)}
          />
        ) : (
          <>
            {mode !== "STANDARD" ? (
              <button
                onClick={() => {
                  if (!inStock) return;
                  setCodOpen(true);
                }}
                disabled={!inStock}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-base"
              >
                🛒 Comprar ahora
              </button>
            ) : (
              <AddToCartButton
                product={product}
                variants={variants}
                selectedVariant={selectedVariant}
                quantity={selectedQty}
                appliedPromotion={
                  breakdown && breakdown.appliedTier && volumePromotion
                    ? {
                        promotionId: volumePromotion.id,
                        type: "VOLUME",
                        tierLabel:
                          breakdown.appliedTier.tier.label ??
                          `${selectedQty} Unidades`,
                        discountPerUnit: breakdown.discountPerUnit,
                        originalUnitPrice: unitPrice,
                      }
                    : undefined
                }
                subscriptionOptIn={
                  subscriptionDiscountPerUnit > 0 && subscriptionPromotion
                    ? {
                        promotionId: subscriptionPromotion.id,
                        email: subscribeEmail.trim(),
                        discountPerUnit: subscriptionDiscountPerUnit,
                      }
                    : undefined
                }
                disabled={!inStock || (selectedVariant ? selectedVariant.stock <= 0 : false)}
              />
            )}
          </>
        )}
      </div>

      {!inStock && (
        <p className="text-center text-sm text-destructive">
          Este producto está agotado
        </p>
      )}

      {product.hasVariants && Object.keys(selectedOptions).length < options.length && (
        <p className="text-center text-sm text-slate-600">
          Por favor selecciona todas las opciones
        </p>
      )}

      <CodOrderModal
        open={codOpen}
        onClose={() => setCodOpen(false)}
        items={[{
          productId: product.id,
          variantId: selectedVariant?.id,
          quantity: selectedQty,
          name: product.name,
          price:
            (breakdown ? unitPrice - breakdown.discountPerUnit : unitPrice) -
            subscriptionDiscountPerUnit,
          originalUnitPrice: unitPrice,
          image: getProductImageUrl(product.images) ?? undefined,
          promotionId:
            breakdown && breakdown.appliedTier && volumePromotion
              ? volumePromotion.id
              : undefined,
          subscriptionOptIn:
            subscriptionDiscountPerUnit > 0 && subscriptionPromotion
              ? {
                  promotionId: subscriptionPromotion.id,
                  email: subscribeEmail.trim(),
                }
              : undefined,
        }]}
        template={codFormTemplate ?? null}
        shippingRestriction={shippingRestriction ?? null}
      />
    </div>
  );
}