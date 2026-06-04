"use client";

import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createOrder } from "@/actions/orders";
import { processCardPayment } from "@/actions/payments";
import { checkCartStock } from "@/actions/stock";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckoutInput } from "@/components/checkout/CheckoutField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import Image from "next/image";
import ApplyCoupon from "@/components/shop/ApplyCoupon";
import TermsAndConditions from "@/components/shop/TermsAndConditions";
import LocationSelector from "@/components/shop/LocationSelector";
import { ShippingOptions } from "@/components/checkout/ShippingOptions";
import type { ShippingRate } from "@/actions/shipping-checkout";
import { usePersistedCheckoutForm } from "@/hooks/use-persisted-checkout-form";
import { AlertTriangle, ChevronUp, ChevronDown, ShoppingBag, Loader2, AlertCircle, CheckCircle2, X, User, Mail, Phone, IdCard, Home, MapPin } from "lucide-react";
import { useTracking } from "@/hooks/useTracking";
import CulqiCheckoutButton from "@/components/shop/CulqiCheckoutButton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { YapeIcon, PlinIcon, VisaIcon, MastercardIcon, PayPalIcon } from "@/components/payment-icons";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import CheckoutUpsell from "@/components/checkout/CheckoutUpsell";
import {
  getCartRecommendations,
  type RecommendationCard,
} from "@/actions/recommendations";

const initialFormData = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerDni: "",
  address: "",
  reference: "",
  paymentMethod: "YAPE" as "YAPE" | "PLIN" | "CARD" | "PAYPAL" | "MERCADOPAGO",
  customerNotes: "",
  acceptTerms: false,
  acceptWhatsApp: false,
  departmentId: "",
  provinceId: "",
  districtCode: "",
  departmentName: "",
  provinceName: "",
  districtName: "",
  documentType: "BOLETA" as "BOLETA" | "FACTURA",
  buyerRuc: "",
  buyerRazonSocial: "",
  buyerFiscalAddress: "",
};

interface CheckoutPageClientProps {
  siteName: string;
  siteLogo: string;
  sunatEnabled: boolean;
  pricesIncludeIgv: boolean;
  /** Departments resolved on the server (avoids a client round-trip). */
  departments: { id: string; code: string; name: string }[];
  /** Enabled payment methods resolved on the server. */
  enabledMethods: {
    yape: boolean;
    plin: boolean;
    card: boolean;
    paypal: boolean;
    mercadopago: boolean;
  };
}

export default function CheckoutPageClient({
  siteName,
  siteLogo,
  sunatEnabled,
  pricesIncludeIgv,
  departments,
  enabledMethods,
}: CheckoutPageClientProps) {
  const router = useRouter();
  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const { formData, setFormData, isLoaded, clearPersistedData } =
    usePersistedCheckoutForm(initialFormData);

  // The cart lives in localStorage (zustand persist) and rehydrates on the
  // client after the first render. Without this gate the page flashes the
  // "empty cart" view on reload before the persisted items load back in.
  const [cartHydrated, setCartHydrated] = useState(false);
  useEffect(() => {
    setCartHydrated(useCartStore.persist.hasHydrated());
    const unsub = useCartStore.persist.onFinishHydration(() => setCartHydrated(true));
    return unsub;
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [stockVerified, setStockVerified] = useState(false);
  const [stockCheckLoading, setStockCheckLoading] = useState(false);
  const [culqiToken, setCulqiToken] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { trackEvent } = useTracking(); 
  
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null);

  // Mobile keyboard detection. While the user is typing in a text field the
  // soft keyboard eats most of the viewport; keeping the tall fixed pay bar
  // visible squeezes the field being filled. We hide the pay bar on focus and
  // restore it on blur so the whole area above the keyboard is usable.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  // Barra de pago móvil: la alerta "Falta completar" se muestra colapsada
  // (una línea tocable) para mantener baja la barra fija; el usuario la
  // expande si quiere ver el detalle de qué campos faltan.
  const [missingAlertExpanded, setMissingAlertExpanded] = useState(false);
  useEffect(() => {
    const isTextField = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.tagName === "TEXTAREA") return true;
      if (el.tagName === "INPUT") {
        const type = (el as HTMLInputElement).type;
        return !["checkbox", "radio", "button", "submit", "file", "range"].includes(type);
      }
      return false;
    };
    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target)) setKeyboardOpen(true);
    };
    const onFocusOut = () => {
      // Defer so focus moving between fields doesn't flicker the bar.
      window.setTimeout(() => {
        if (!isTextField(document.activeElement)) setKeyboardOpen(false);
      }, 120);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Checkout upsell: recommend against the current basket. Re-fetches when the
  // basket changes (e.g. after the customer adds an upsell), excluding items
  // already in the cart.
  const [upsellRecs, setUpsellRecs] = useState<RecommendationCard[]>([]);
  const cartIdsKey = items.map((i) => i.productId).join(",");
  useEffect(() => {
    const ids = cartIdsKey ? cartIdsKey.split(",") : [];
    if (ids.length === 0) {
      setUpsellRecs([]);
      return;
    }
    let cancelled = false;
    getCartRecommendations(ids, 3)
      .then((r) => {
        if (!cancelled) setUpsellRecs(r.filter((x) => !ids.includes(x.id)));
      })
      .catch(() => {
        if (!cancelled) setUpsellRecs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cartIdsKey]);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: number;
    discount: number;
    description: string | null;
  } | null>(null);

  // ✅ NUEVO: Estado para mostrar qué falta para activar el botón de tarjeta
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);
  const [showMissingAlert, setShowMissingAlert] = useState(false);

  // Refs para scroll automático
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);
  const termsRefMobile = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const shippingRef = useRef<HTMLDivElement>(null);

  const processingRef = useRef(false);

  // Scrolls to the terms checkbox that's actually visible on the current
  // breakpoint (desktop lives in the summary card, mobile in the form body).
  // `offsetParent` is null when an ancestor is `display:none` (lg:hidden), so
  // this reliably picks the rendered one.
  const scrollToTerms = () => {
    const el = termsRefMobile.current?.offsetParent
      ? termsRefMobile.current
      : termsRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const verifyStockBeforeCheckout = async () => {
    setStockCheckLoading(true);
    const stockItems = items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
    }));

    const result = await checkCartStock(stockItems);

    if (!result.success) {
      setError("Hay productos sin stock suficiente. Por favor revisa tu carrito.");
      setStockVerified(false);
    } else {
      setStockVerified(true);
      setError(null);
    }

    setStockCheckLoading(false);
  };

  useEffect(() => {
    if (items.length > 0 && isLoaded) {
      verifyStockBeforeCheckout();
      trackEvent("InitiateCheckout", {
        value: getTotalPrice(),
        currency: "PEN",
        num_items: getTotalItems(),
        contents: items.map((item) => ({
          id: item.productId,
          quantity: item.quantity,
          item_price: item.price,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, isLoaded]);

  useEffect(() => {
    if (formData.districtCode) {
      setSelectedShippingRate(null);
    }
  }, [formData.districtCode]);

  // ✅ NUEVO: Validar requisitos para pago con tarjeta en tiempo real
  useEffect(() => {
    if (formData.paymentMethod === "CARD") {
      const missing: string[] = [];
      
      if (!formData.customerName || formData.customerName.trim().length < 3) {
        missing.push("Nombre completo");
      }
      if (!formData.customerEmail || !formData.customerEmail.includes("@")) {
        missing.push("Email válido");
      }
      if (!formData.customerPhone || formData.customerPhone.length < 9) {
        missing.push("Teléfono");
      }
      if (!formData.districtCode) {
        missing.push("Ubicación (departamento, provincia, distrito)");
      }
      if (!selectedShippingRate) {
        missing.push("Método de envío");
      }
      if (!formData.address || formData.address.trim().length < 10) {
        missing.push("Dirección completa");
      }
      if (!formData.acceptTerms) {
        missing.push("Aceptar términos y condiciones");
      }

      setMissingRequirements(missing);
    }
  }, [
    formData.paymentMethod,
    formData.customerName,
    formData.customerEmail,
    formData.customerPhone,
    formData.districtCode,
    formData.address,
    formData.acceptTerms,
    selectedShippingRate
  ]);

  // ✅ NUEVO: Función para hacer scroll al primer campo faltante
  const scrollToFirstMissing = () => {
    setShowMissingAlert(true);
    
    // Determinar el primer elemento faltante y hacer scroll
    if (!formData.customerName || formData.customerName.trim().length < 3) {
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameRef.current?.focus();
    } else if (!formData.customerEmail || !formData.customerEmail.includes("@")) {
      emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      emailRef.current?.focus();
    } else if (!formData.customerPhone || formData.customerPhone.length < 7) {
      phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneRef.current?.focus();
    } else if (!formData.districtCode) {
      locationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (!selectedShippingRate) {
      shippingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (!formData.address || formData.address.trim().length < 10) {
      addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addressRef.current?.focus();
    } else if (!formData.acceptTerms) {
      scrollToTerms();
    }

    // Auto-ocultar la alerta después de 5 segundos
    setTimeout(() => setShowMissingAlert(false), 5000);
  };

  const processPaymentAutomatically = async () => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;
    setIsProcessingPayment(true);
    setError(null);

    try {
      if (!formData.districtCode || !selectedShippingRate || !formData.acceptTerms) {
        setError("Por favor completa todos los campos requeridos");
        setIsProcessingPayment(false);
        processingRef.current = false;
        setCulqiToken(null);
        return;
      }

      const stockItems = items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      }));

      const stockResult = await checkCartStock(stockItems);
      if (!stockResult.success) {
        setError("Algunos productos ya no tienen stock disponible.");
        setIsProcessingPayment(false);
        processingRef.current = false;
        setCulqiToken(null);
        return;
      }

      if (sunatEnabled && formData.documentType === "FACTURA") {
        if (!formData.buyerRuc || !/^(10|20)\d{9}$/.test(formData.buyerRuc)) {
          setError("Ingresa un RUC válido (11 dígitos, empieza con 10 o 20)");
          setIsProcessingPayment(false);
          processingRef.current = false;
          setCulqiToken(null);
          return;
        }
        if (!formData.buyerRazonSocial.trim()) {
          setError("Ingresa la razón social");
          setIsProcessingPayment(false);
          processingRef.current = false;
          setCulqiToken(null);
          return;
        }
        if (!formData.buyerFiscalAddress.trim()) {
          setError("Ingresa la dirección fiscal");
          setIsProcessingPayment(false);
          processingRef.current = false;
          setCulqiToken(null);
          return;
        }
      }

      trackEvent("AddPaymentInfo", {
        value: total,
        currency: "PEN",
        payment_type: "CARD",
        contents: items.map((item) => ({
          id: item.productId,
          quantity: item.quantity,
          item_price: item.price,
        })),
      });

      const orderData = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim().toLowerCase(),
        customerPhone: formData.customerPhone.trim(),
        customerDni: formData.customerDni.trim() || undefined,
        address: formData.address.trim(),
        district: formData.districtName || formData.districtCode,
        city: formData.provinceName || "Lima",
        department: formData.departmentName || "Lima",
        districtCode: formData.districtCode,
        reference: formData.reference?.trim() || undefined,
        paymentMethod: "CARD" as const,
        customerNotes: formData.customerNotes?.trim() || undefined,
        acceptWhatsApp: formData.acceptWhatsApp || false,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId || undefined,
          name: item.name,
          variantName: item.variantName || undefined,
          price: item.price,
          quantity: item.quantity,
          image: item.image || undefined,
          options: item.options || undefined,
          promotionId:
            item.appliedPromotion?.type === "VOLUME"
              ? item.appliedPromotion.promotionId
              : undefined,
          bundlePromotionId:
            item.appliedPromotion?.type === "BUNDLE"
              ? item.appliedPromotion.promotionId
              : undefined,
          subscriptionOptIn: item.subscriptionOptIn
            ? {
                promotionId: item.subscriptionOptIn.promotionId,
                email: item.subscriptionOptIn.email,
              }
            : undefined,
          customDesign: item.customDesign,
          customDesignImages: item.customDesignImages,
        })),
        shipping: appliedCoupon?.type === "FREE_SHIPPING" ? 0 : selectedShippingRate.finalCost,
        shippingRateId: selectedShippingRate.id,
        shippingMethod: selectedShippingRate.name,
        shippingCarrier: selectedShippingRate.carrier || undefined,
        shippingEstimatedDays: selectedShippingRate.estimatedDays || undefined,
        couponCode: appliedCoupon?.code || undefined,
        couponDiscount: appliedCoupon?.discount || 0,
        documentType: sunatEnabled ? formData.documentType : undefined,
        buyerRuc: formData.documentType === "FACTURA" ? formData.buyerRuc : undefined,
        buyerRazonSocial: formData.documentType === "FACTURA" ? formData.buyerRazonSocial : undefined,
        buyerFiscalAddress: formData.documentType === "FACTURA" ? formData.buyerFiscalAddress : undefined,
      };

      const result = await createOrder(orderData);

      if (!result.success) {
        setError(result.error || "Error al crear la orden");
        setIsProcessingPayment(false);
        processingRef.current = false;
        setCulqiToken(null);
        return;
      }

      const paymentResult = await processCardPayment({
        orderId: result.orderId!,
        culqiToken: culqiToken!,
        email: formData.customerEmail,
      });

      if (!paymentResult.success) {
        setError(paymentResult.error || "Error al procesar el pago con tarjeta");
        setIsProcessingPayment(false);
        processingRef.current = false;
        setCulqiToken(null);
        return;
      }

      clearCart();
      clearPersistedData();

      router.push(`/orden/${result.orderId}/confirmacion?token=${result.viewToken}`);

    } catch (err) {
      console.error("❌ Error en proceso automático:", err);
      setError("Error inesperado al procesar el pago. Por favor intenta nuevamente.");
      setIsProcessingPayment(false);
      processingRef.current = false;
      setCulqiToken(null);
    }
  };

  useEffect(() => {
    if (culqiToken && !processingRef.current && formData.paymentMethod === "CARD") {
      processPaymentAutomatically();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [culqiToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.paymentMethod === "CARD") {
      return;
    }

    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      // Validation follows the visual top-to-bottom order of the form so the
      // first error always points the customer to the earliest empty field.
      if (!formData.customerName || formData.customerName.trim().length < 3) {
        setError("El nombre debe tener al menos 3 caracteres");
        nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameRef.current?.focus();
        setLoading(false);
        return;
      }

      if (!formData.customerEmail || !formData.customerEmail.includes("@")) {
        setError("Ingresa un email válido");
        emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailRef.current?.focus();
        setLoading(false);
        return;
      }

      if (!formData.customerPhone || formData.customerPhone.length < 7) {
        setError("Ingresa un teléfono válido");
        phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneRef.current?.focus();
        setLoading(false);
        return;
      }

      if (!formData.districtCode) {
        setError("Por favor selecciona departamento, provincia y distrito");
        locationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setLoading(false);
        return;
      }

      if (!selectedShippingRate) {
        setError("Por favor selecciona un método de envío");
        shippingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setLoading(false);
        return;
      }

      if (!formData.address || formData.address.trim().length < 10) {
        setError("La dirección debe tener al menos 10 caracteres");
        addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        addressRef.current?.focus();
        setLoading(false);
        return;
      }

      if (sunatEnabled && formData.documentType === "FACTURA") {
        if (!formData.buyerRuc || !/^(10|20)\d{9}$/.test(formData.buyerRuc)) {
          setError("Ingresa un RUC válido (11 dígitos, empieza con 10 o 20)");
          setLoading(false);
          return;
        }
        if (!formData.buyerRazonSocial.trim()) {
          setError("Ingresa la razón social");
          setLoading(false);
          return;
        }
        if (!formData.buyerFiscalAddress.trim()) {
          setError("Ingresa la dirección fiscal");
          setLoading(false);
          return;
        }
      }

      // Terms last — it sits at the bottom of the form (mobile card / desktop
      // summary), so it's the final gate before placing the order.
      if (!formData.acceptTerms) {
        setError("Debes aceptar los términos y condiciones");
        scrollToTerms();
        setLoading(false);
        return;
      }

      const stockItems = items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      }));

      const stockResult = await checkCartStock(stockItems);
      if (!stockResult.success) {
        setError("Algunos productos ya no tienen stock disponible.");
        setLoading(false);
        return;
      }

      trackEvent("AddPaymentInfo", {
        value: total,
        currency: "PEN",
        payment_type: formData.paymentMethod,
        contents: items.map((item) => ({
          id: item.productId,
          quantity: item.quantity,
          item_price: item.price,
        })),
      });

      const orderData = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim().toLowerCase(),
        customerPhone: formData.customerPhone.trim(),
        customerDni: formData.customerDni.trim() || undefined,
        address: formData.address.trim(),
        district: formData.districtName || formData.districtCode,
        city: formData.provinceName || "Lima",
        department: formData.departmentName || "Lima",
        districtCode: formData.districtCode,
        reference: formData.reference?.trim() || undefined,
        paymentMethod: formData.paymentMethod,
        customerNotes: formData.customerNotes?.trim() || undefined,
        acceptWhatsApp: formData.acceptWhatsApp || false,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId || undefined,
          name: item.name,
          variantName: item.variantName || undefined,
          price: item.price,
          quantity: item.quantity,
          image: item.image || undefined,
          options: item.options || undefined,
          promotionId:
            item.appliedPromotion?.type === "VOLUME"
              ? item.appliedPromotion.promotionId
              : undefined,
          bundlePromotionId:
            item.appliedPromotion?.type === "BUNDLE"
              ? item.appliedPromotion.promotionId
              : undefined,
          subscriptionOptIn: item.subscriptionOptIn
            ? {
                promotionId: item.subscriptionOptIn.promotionId,
                email: item.subscriptionOptIn.email,
              }
            : undefined,
          customDesign: item.customDesign,
          customDesignImages: item.customDesignImages,
        })),
        shipping: appliedCoupon?.type === "FREE_SHIPPING" ? 0 : selectedShippingRate.finalCost,
        shippingRateId: selectedShippingRate.id,
        shippingMethod: selectedShippingRate.name,
        shippingCarrier: selectedShippingRate.carrier || undefined,
        shippingEstimatedDays: selectedShippingRate.estimatedDays || undefined,
        couponCode: appliedCoupon?.code || undefined,
        couponDiscount: appliedCoupon?.discount || 0,
        documentType: sunatEnabled ? formData.documentType : undefined,
        buyerRuc: formData.documentType === "FACTURA" ? formData.buyerRuc : undefined,
        buyerRazonSocial: formData.documentType === "FACTURA" ? formData.buyerRazonSocial : undefined,
        buyerFiscalAddress: formData.documentType === "FACTURA" ? formData.buyerFiscalAddress : undefined,
      };

      const result = await createOrder(orderData);

      if (!result.success) {
        setError(result.error || "Error al crear la orden");
        setLoading(false);
        return;
      }

      // MercadoPago redirige FUERA del sitio para pagar. No vaciamos el carrito
      // aquí: si la pasarela falla o el cliente vuelve atrás, conserva su
      // carrito y sus datos. El carrito se limpia en el redirect-client justo
      // antes de salir hacia MercadoPago.
      const isExternalRedirect = result.paymentMethod === "MERCADOPAGO";
      if (!isExternalRedirect) {
        clearCart();
        clearPersistedData();
      }

      const tokenQs = `?token=${result.viewToken}`;
      if (result.paymentMethod === "YAPE" || result.paymentMethod === "PLIN") {
        router.push(`/orden/${result.orderId}/pago-pendiente${tokenQs}`);
      } else if (result.paymentMethod === "PAYPAL") {
        router.push(`/orden/${result.orderId}/pago-paypal${tokenQs}`);
      } else if (result.paymentMethod === "MERCADOPAGO") {
        router.push(`/orden/${result.orderId}/pago-mercadopago${tokenQs}`);
      } else {
        router.push(`/orden/${result.orderId}/confirmacion${tokenQs}`);
      }
    } catch (err) {
      console.error("Error al crear orden:", err);
      setError("Error inesperado. Por favor intenta nuevamente.");
      setLoading(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const trimmed = value.trim();
    let errorMsg = "";

    switch (name) {
      case "customerName":
        if (trimmed.length > 0 && trimmed.length < 3)
          errorMsg = "El nombre debe tener al menos 3 caracteres";
        break;
      case "customerEmail":
        if (trimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
          errorMsg = "Ingresa un email válido";
        break;
      case "customerPhone":
        if (trimmed.length > 0 && trimmed.replace(/\D/g, "").length < 7)
          errorMsg = "Ingresa un teléfono válido (mínimo 7 dígitos)";
        break;
      case "address":
        if (trimmed.length > 0 && trimmed.length < 10)
          errorMsg = "La dirección debe tener al menos 10 caracteres";
        break;
    }

    if (errorMsg) {
      setValidationErrors({ ...validationErrors, [name]: errorMsg });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === "customerPhone") {
      processedValue = value.replace(/\D/g, "").slice(0, 9);
    } else if (name === "customerDni") {
      processedValue = value.replace(/\D/g, "").slice(0, 8);
    }
    setFormData({
      ...formData,
      [name]: processedValue,
    });
    if (validationErrors[name]) {
      const newErrors = { ...validationErrors };
      delete newErrors[name];
      setValidationErrors(newErrors);
    }
    // Ocultar alerta cuando el usuario empieza a completar
    if (showMissingAlert) {
      setShowMissingAlert(false);
    }
  };

  const handleLocationChange = (newLocation: {
    departmentId: string;
    provinceId: string;
    districtCode: string;
    departmentName: string;
    provinceName: string;
    districtName: string;
  }) => {
    setFormData({
      ...formData,
      ...newLocation,
    });
    
    if (validationErrors.district || validationErrors.department) {
      const newErrors = { ...validationErrors };
      delete newErrors.district;
      delete newErrors.department;
      delete newErrors.city;
      setValidationErrors(newErrors);
    }
    if (showMissingAlert) {
      setShowMissingAlert(false);
    }
  };

  const handleShippingRateSelect = (rate: ShippingRate | null) => {
    setSelectedShippingRate(rate);
    if (showMissingAlert) {
      setShowMissingAlert(false);
    }
  };

  const handleCulqiSuccess = (token: string) => {
    setCulqiToken(token);
    setError(null);
  };

  const handleCulqiError = (errorMessage: string) => {
    console.error('❌ Error de Culqi:', errorMessage);
    setError(errorMessage);
    setCulqiToken(null);
    setIsProcessingPayment(false);
    processingRef.current = false;
  };

  const subtotal = getTotalPrice();
  const discount = appliedCoupon?.discount || 0;
  const finalShippingCost = selectedShippingRate
    ? (appliedCoupon?.type === "FREE_SHIPPING" ? 0 : selectedShippingRate.finalCost)
    : 0;
  const igvAmount = pricesIncludeIgv
    ? subtotal - subtotal / 1.18
    : subtotal * 0.18;
  const total = pricesIncludeIgv
    ? subtotal + finalShippingCost - discount
    : subtotal + igvAmount + finalShippingCost - discount;

  // Wait for both the cart store and the persisted form to rehydrate before
  // deciding anything — otherwise a reload flashes "empty cart" while the
  // localStorage items are still loading.
  if (!cartHydrated || !isLoaded) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
          <Button asChild className="mt-4">
            <Link href="/productos">Ver Productos</Link>
          </Button>
        </div>
      </div>
    );
  }

  // A stable JSX element (NOT a nested component). Defining a component inside
  // the render body creates a new type every render, which remounts the whole
  // subtree — that stole focus from the coupon input the moment it was tapped.
  const orderSummaryContent = (
    <>
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-medium line-clamp-2 leading-snug">{item.name}</p>
              {item.variantName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.variantName}
                </p>
              )}
              <p className="mt-1.5 text-muted-foreground font-medium">
                {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {upsellRecs.length > 0 && (
        <>
          <Separator className="my-4" />
          <CheckoutUpsell recs={upsellRecs} />
        </>
      )}

      <Separator className="my-4" />

      <div className="px-1">
        <ApplyCoupon
          subtotal={subtotal}
          onCouponApplied={setAppliedCoupon}
          onCouponRemoved={() => setAppliedCoupon(null)}
          currentCoupon={
            appliedCoupon
              ? { code: appliedCoupon.code, discount: appliedCoupon.discount }
              : null
          }
        />
      </div>

      <Separator className="my-4" />

      <div className="space-y-2.5 px-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        {sunatEnabled && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {pricesIncludeIgv ? "IGV incluido (18%)" : "IGV (18%)"}
            </span>
            <span className={pricesIncludeIgv ? "text-muted-foreground" : "font-medium"}>
              {pricesIncludeIgv ? `incl. ${formatPrice(igvAmount)}` : formatPrice(igvAmount)}
            </span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Descuento</span>
            <span className="text-green-600 font-medium">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <div className="flex-1">
            <span className="text-muted-foreground">Envío</span>
            {selectedShippingRate && (
              <span className="text-xs text-muted-foreground block mt-0.5">
                {selectedShippingRate.name}
                {selectedShippingRate.estimatedDays && (
                  <> • {selectedShippingRate.estimatedDays}</>
                )}
              </span>
            )}
          </div>
          <span className="font-medium">
            {appliedCoupon?.type === "FREE_SHIPPING" || selectedShippingRate?.isFree ? (
              <span className="text-green-600">¡Gratis!</span>
            ) : selectedShippingRate ? (
              formatPrice(selectedShippingRate.finalCost)
            ) : (
              <span className="text-xs text-muted-foreground">Pendiente</span>
            )}
          </span>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex justify-between text-lg font-bold px-1">
        <span>Total</span>
        <span className="text-primary">{formatPrice(total)}</span>
      </div>
    </>
  );

  return (
    <>
      {/* OVERLAY DE PROCESAMIENTO */}
      {isProcessingPayment && (
        <div
          role="status"
          aria-live="assertive"
          aria-busy="true"
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <Card className="w-[90%] max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold">Procesando tu pago...</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Por favor espera mientras confirmamos tu pago con el banco.
                    No cierres esta ventana.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ✅ ALERTA FLOTANTE CON REQUISITOS FALTANTES */}
      {showMissingAlert && missingRequirements.length > 0 && formData.paymentMethod === "CARD" && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg animate-in slide-in-from-top-5"
        >
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-2xl border border-red-700 backdrop-blur-sm">
            <div className="p-4 flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base mb-2.5">Completa estos campos para continuar:</p>
                <ul className="space-y-1.5 text-sm">
                  {missingRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-200 mt-0.5">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3 bg-white/20 hover:bg-white/30 text-white border-white/30 h-8 text-xs font-semibold"
                  onClick={scrollToFirstMissing}
                >
                  Ir al primer campo faltante →
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setShowMissingAlert(false)}
                className="flex-shrink-0 text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Ver resumen del pedido"
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 active:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <ShoppingBag className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <span className="text-xs text-muted-foreground block">
                    {getTotalItems()} {getTotalItems() === 1 ? 'producto' : 'productos'}
                  </span>
                  <span className="text-sm font-semibold block">
                    Ver resumen
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{formatPrice(total)}</span>
                <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </button>
          </SheetTrigger>
          <SheetContent side="top" className="max-h-[85vh] overflow-y-auto px-4 sm:px-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle>Resumen del Pedido</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-6">
              {orderSummaryContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="w-full bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-8 lg:pb-12">
          <form onSubmit={handleSubmit} className="checkout-form w-full">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 w-full">
              <div className="lg:col-span-2 space-y-6 min-w-0">
                {/* Información del Cliente */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 min-w-0">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CheckoutInput
                        ref={nameRef}
                        id="customerName"
                        name="customerName"
                        label="Nombre Completo"
                        required
                        icon={<User />}
                        value={formData.customerName}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="Juan Pérez"
                        autoComplete="name"
                        error={validationErrors.customerName}
                      />
                      <CheckoutInput
                        id="customerDni"
                        name="customerDni"
                        label="DNI (opcional)"
                        icon={<IdCard />}
                        value={formData.customerDni}
                        onChange={handleInputChange}
                        placeholder="12345678"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={8}
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <CheckoutInput
                        ref={emailRef}
                        id="customerEmail"
                        name="customerEmail"
                        type="email"
                        label="Email"
                        required
                        icon={<Mail />}
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="juan@example.com"
                        autoComplete="email"
                        inputMode="email"
                        error={validationErrors.customerEmail}
                      />
                      <CheckoutInput
                        ref={phoneRef}
                        id="customerPhone"
                        name="customerPhone"
                        type="text"
                        label="Teléfono/WhatsApp"
                        required
                        icon={<Phone />}
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="987654321"
                        autoComplete="tel"
                        inputMode="numeric"
                        maxLength={9}
                        error={validationErrors.customerPhone}
                      />
                    </div>

                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="acceptWhatsApp"
                        checked={formData.acceptWhatsApp}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, acceptWhatsApp: checked === true })
                        }
                      />
                      <Label
                        htmlFor="acceptWhatsApp"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Acepto recibir actualizaciones de mi pedido por WhatsApp
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Dirección de Envío */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Dirección de Envío</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 min-w-0">
                    <div ref={locationRef}>
                      <LocationSelector
                        variant="checkout"
                        value={{
                          departmentId: formData.departmentId,
                          provinceId: formData.provinceId,
                          districtCode: formData.districtCode,
                        }}
                        onChange={handleLocationChange}
                        initialDepartments={departments}
                        errors={{
                          department: validationErrors.department,
                          province: validationErrors.city,
                          district: validationErrors.district,
                        }}
                      />
                    </div>

                    {formData.districtCode && (
                      <div ref={shippingRef} className="pt-4 border-t">
                        <ShippingOptions
                          districtCode={formData.districtCode}
                          subtotal={subtotal}
                          onSelect={handleShippingRateSelect}
                          selectedRateId={selectedShippingRate?.id}
                        />
                      </div>
                    )}

                    <CheckoutInput
                      ref={addressRef}
                      id="address"
                      name="address"
                      label="Dirección"
                      required
                      icon={<Home />}
                      value={formData.address}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Av. Larco 123, Dpto 501"
                      autoComplete="street-address"
                      error={validationErrors.address}
                    />

                    <CheckoutInput
                      id="reference"
                      name="reference"
                      label="Referencia (opcional)"
                      icon={<MapPin />}
                      value={formData.reference}
                      onChange={handleInputChange}
                      placeholder="Edificio blanco al lado del banco"
                    />
                  </CardContent>
                </Card>

                {/* Comprobante de Pago */}
                {sunatEnabled && (
                  <Card className="min-w-0">
                    <CardHeader>
                      <CardTitle className="text-lg">Comprobante de Pago</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="documentType"
                            value="BOLETA"
                            checked={formData.documentType === "BOLETA"}
                            onChange={() => setFormData({ ...formData, documentType: "BOLETA" })}
                          />
                          <span className="text-sm font-medium">Boleta de Venta</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="documentType"
                            value="FACTURA"
                            checked={formData.documentType === "FACTURA"}
                            onChange={() => setFormData({ ...formData, documentType: "FACTURA" })}
                          />
                          <span className="text-sm font-medium">Factura (requiere RUC)</span>
                        </label>
                      </div>

                      {formData.documentType === "FACTURA" && (
                        <div className="space-y-3 pt-2 border-t">
                          <CheckoutInput
                            id="buyerRuc"
                            label="RUC"
                            required
                            placeholder="20123456789"
                            maxLength={11}
                            inputMode="numeric"
                            value={formData.buyerRuc}
                            onChange={(e) =>
                              setFormData({ ...formData, buyerRuc: e.target.value })
                            }
                            error={validationErrors.buyerRuc}
                          />
                          <CheckoutInput
                            id="buyerRazonSocial"
                            label="Razón Social"
                            required
                            placeholder="Mi Empresa SAC"
                            value={formData.buyerRazonSocial}
                            onChange={(e) =>
                              setFormData({ ...formData, buyerRazonSocial: e.target.value })
                            }
                            error={validationErrors.buyerRazonSocial}
                          />
                          <CheckoutInput
                            id="buyerFiscalAddress"
                            label="Dirección Fiscal"
                            required
                            placeholder="Av. Ejemplo 123, Lima"
                            value={formData.buyerFiscalAddress}
                            onChange={(e) =>
                              setFormData({ ...formData, buyerFiscalAddress: e.target.value })
                            }
                            error={validationErrors.buyerFiscalAddress}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Método de Pago */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 min-w-0">
                    <PaymentMethodSelector
                      selectedMethod={formData.paymentMethod}
                      initialEnabledMethods={enabledMethods}
                      onMethodChange={(method) => {
                        setFormData({ ...formData, paymentMethod: method });
                        setCulqiToken(null);
                        processingRef.current = false;
                        setShowMissingAlert(false);
                      }}
                      disabled={loading || isProcessingPayment}
                    />
                  </CardContent>
                </Card>

                {/* Notas Adicionales */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Notas Adicionales (opcional)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      name="customerNotes"
                      value={formData.customerNotes}
                      onChange={handleInputChange}
                      placeholder="Instrucciones especiales de entrega, etc."
                      rows={4}
                      className="w-full"
                    />
                  </CardContent>
                </Card>

                {/* Términos — móvil. Vive en el flujo del formulario (no en la
                    barra fija) para mantener el pay bar bajo y dejar más espacio
                    al teclado. En desktop los términos están en el resumen. */}
                <div ref={termsRefMobile} className="lg:hidden">
                  <div className="flex items-start space-x-2 rounded-lg border bg-muted/30 p-3">
                    <Checkbox
                      id="acceptTermsMobile"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) => {
                        setFormData({ ...formData, acceptTerms: checked === true });
                        if (checked && showMissingAlert) {
                          setShowMissingAlert(false);
                        }
                      }}
                      className="mt-1 flex-shrink-0"
                    />
                    <Label
                      htmlFor="acceptTermsMobile"
                      className="text-sm font-normal cursor-pointer leading-relaxed flex-1 block"
                    >
                      He leído y acepto los <TermsAndConditions>
                        <span className="text-primary underline font-medium">
                          términos y condiciones
                        </span>
                      </TermsAndConditions> de compra <span className="text-destructive">*</span>
                    </Label>
                  </div>
                </div>

                {/* Sellos de pago — móvil. Viven en el flujo del contenido (no
                    en la barra fija) para mantener el pay bar bajo y dejar más
                    formulario visible en primera vista. En desktop los métodos
                    se muestran junto al botón del resumen. */}
                <div className="lg:hidden flex items-center justify-center gap-2 flex-wrap py-1">
                  <span className="flex items-center gap-2" aria-hidden="true">
                    <VisaIcon width={36} height={24} className="opacity-80" />
                    <MastercardIcon width={32} height={20} className="opacity-80" />
                    <YapeIcon width={28} height={28} className="opacity-80" />
                    <PlinIcon width={28} height={28} className="opacity-80" />
                    <PayPalIcon width={64} height={36} className="opacity-80" />
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">🔒 Pago seguro</span>
                </div>
              </div>

              {/* Resumen Desktop */}
              <div className="hidden lg:block">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Resumen del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {orderSummaryContent}

                    <div ref={termsRef} className="pt-2">
                      <div className="flex items-start space-x-2 rounded-lg border bg-muted/30 p-3">
                        <Checkbox
                          id="acceptTerms"
                          checked={formData.acceptTerms}
                          onCheckedChange={(checked) => {
                            setFormData({ ...formData, acceptTerms: checked === true });
                            if (checked && showMissingAlert) {
                              setShowMissingAlert(false);
                            }
                          }}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="acceptTerms"
                            className="text-sm font-normal cursor-pointer leading-relaxed block"
                          >
                            He leído y acepto los <TermsAndConditions>
                              <span className="text-primary underline cursor-pointer font-medium hover:text-primary/80">
                                términos y condiciones
                              </span>
                            </TermsAndConditions> de compra <span className="text-destructive">*</span>
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* ✅ BOTÓN DE PAGO CON TARJETA - DESKTOP */}
                    {formData.paymentMethod === "CARD" ? (
                      <div className="space-y-3 pt-2">
                        {/* Alertas de validación */}
                        {missingRequirements.length > 0 ? (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-amber-900 text-sm mb-1.5">Para continuar:</p>
                                <ul className="space-y-0.5 text-xs text-amber-800">
                                  {missingRequirements.map((req, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-amber-600 font-bold">•</span>
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 h-7 text-xs border-amber-400 text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-semibold"
                                  onClick={scrollToFirstMissing}
                                >
                                  Ir al primer campo →
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                            <div className="flex gap-2 items-start">
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                              <div className="flex-1">
                                <p className="font-bold text-green-900 text-sm">¡Todo listo!</p>
                                <p className="text-xs text-green-800 mt-1">
                                  Completa tu pago de forma segura.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Botón de Culqi */}
                        <CulqiCheckoutButton
                          key={`culqi-desktop-${formData.customerEmail}-${formData.acceptTerms}`}
                          amount={Math.round(total * 100)}
                          email={formData.customerEmail}
                          customerName={formData.customerName}
                          onSuccess={handleCulqiSuccess}
                          onError={handleCulqiError}
                          disabled={
                            !formData.customerEmail || 
                            !formData.customerName || 
                            !formData.acceptTerms ||
                            !selectedShippingRate ||
                            isProcessingPayment ||
                            missingRequirements.length > 0
                          }
                          className="w-full"
                          siteName={siteName}
                          siteLogo={siteLogo}
                        />
                      </div>
                    ) : (
                      /* Botón para Yape/Plin/PayPal - Desktop */
                      <Button
                        type="submit"
                        variant="cta"
                        size="lg"
                        className="w-full"
                        disabled={
                          loading ||
                          !stockVerified ||
                          stockCheckLoading ||
                          !selectedShippingRate ||
                          !formData.acceptTerms
                        }
                        onClick={handleSubmit}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : stockCheckLoading ? (
                          "Verificando stock..."
                        ) : !selectedShippingRate ? (
                          "Selecciona método de envío"
                        ) : (
                          `Confirmar Pedido ${formatPrice(total)}`
                        )}
                      </Button>
                    )}

                    <div className="space-y-2">
                      <p className="text-center text-xs text-muted-foreground">
                        🔒 Pago 100% seguro y encriptado
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Aceptamos:</span>
                        <div className="flex items-center gap-2" aria-hidden="true">
                          <VisaIcon width={28} height={18} className="opacity-70" />
                          <MastercardIcon width={26} height={16} className="opacity-70" />
                          <YapeIcon width={24} height={24} className="opacity-70" />
                          <PlinIcon width={24} height={24} className="opacity-70" />
                          <PayPalIcon width={66} height={40} className="opacity-70" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Botón flotante móvil. SIEMPRE visible — el CTA de pago nunca debe
          desaparecer (best practice de checkout móvil). Cuando el teclado está
          abierto se colapsa a solo el botón: se ocultan los elementos
          decorativos (iconos de confianza y la alerta de validación de tarjeta)
          para no robar espacio, pero el cliente siempre puede pagar sin tener
          que cerrar el teclado. El campo enfocado se desplaza por encima vía
          `interactive-widget=resizes-content` + scroll-margin. */}
      <div data-checkout-paybar className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-2xl safe-area-pb">
        <div className="px-4 py-3 space-y-2.5">
          {/* ✅ BOTÓN DE PAGO CON TARJETA - MÓVIL */}
          {formData.paymentMethod === "CARD" ? (
            <div className="space-y-2">
              {/* Alerta compacta para móvil — una sola línea tocable que se
                  expande para ver el detalle. Oculta mientras se escribe para
                  dejar la barra fija en solo el botón de pago. */}
              {!keyboardOpen && (
                missingRequirements.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setMissingAlertExpanded((v) => !v)}
                      aria-expanded={missingAlertExpanded}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
                      <span className="font-bold text-amber-900 flex-1">
                        Falta completar ({missingRequirements.length})
                      </span>
                      {missingAlertExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
                      )}
                    </button>
                    {missingAlertExpanded && (
                      <p className="text-amber-800 px-2.5 pb-2 -mt-0.5 pl-7">
                        {missingRequirements.join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs">
                    <div className="flex gap-2 items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" aria-hidden="true" />
                      <p className="font-bold text-green-900">¡Listo para pagar!</p>
                    </div>
                  </div>
                )
              )}

              <CulqiCheckoutButton
                key={`culqi-mobile-${formData.customerEmail}-${formData.acceptTerms}`}
                amount={Math.round(total * 100)}
                email={formData.customerEmail}
                customerName={formData.customerName}
                onSuccess={handleCulqiSuccess}
                onError={handleCulqiError}
                disabled={
                  !formData.customerEmail || 
                  !formData.customerName || 
                  !formData.acceptTerms ||
                  !selectedShippingRate ||
                  isProcessingPayment ||
                  missingRequirements.length > 0
                }
                className="w-full"
                siteName={siteName}
                siteLogo={siteLogo}
              />
            </div>
          ) : (
            /* Botón para Yape/Plin/PayPal - Móvil */
            <Button
              type="submit"
              variant="cta"
              size="lg"
              className="w-full text-base font-semibold h-12"
              disabled={
                loading ||
                !stockVerified ||
                stockCheckLoading ||
                !selectedShippingRate
              }
              onClick={handleSubmit}
            >
              {loading ? (
                "Procesando..."
              ) : stockCheckLoading ? (
                "Verificando stock..."
              ) : !selectedShippingRate ? (
                "Selecciona método de envío"
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Confirmar Pedido</span>
                  <span className="font-bold">{formatPrice(total)}</span>
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}