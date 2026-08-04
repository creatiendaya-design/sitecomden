"use client";

import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createOrder } from "@/actions/orders";
import { processCardPayment } from "@/actions/payments";
import { startGatewayCheckout } from "@/actions/payment-redirect";
import { checkCartStock } from "@/actions/stock";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckoutInput } from "@/components/checkout/CheckoutField";
import {
  checkoutPayButtonClass,
  checkoutPayButtonSizeClass,
} from "@/components/checkout/pay-button-class";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckoutErrorBanner } from "@/components/checkout/CheckoutErrorBanner";
import Link from "next/link";
import Image from "next/image";
import ApplyCoupon from "@/components/shop/ApplyCoupon";
import TermsAndConditions from "@/components/shop/TermsAndConditions";
import LocationSelector from "@/components/shop/LocationSelector";
import { ShippingOptions } from "@/components/checkout/ShippingOptions";
import type { ShippingRate } from "@/actions/shipping-checkout";
import { usePersistedCheckoutForm } from "@/hooks/use-persisted-checkout-form";
import { ChevronDown, ShoppingBag, Loader2, AlertCircle, CheckCircle2, X, User, Mail, Phone, IdCard, Home, MapPin } from "lucide-react";
import { useTracking } from "@/hooks/useTracking";
import CulqiCheckoutButton from "@/components/shop/CulqiCheckoutButton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AcceptedPaymentMarks } from "@/components/checkout/AcceptedPaymentMarks";
import {
  PaymentMethodSelector,
  type MethodValue as CheckoutPaymentMethod,
} from "@/components/checkout/PaymentMethodSelector";
import {
  MercadoPagoCardBrick,
  type MercadoPagoBrickController,
} from "@/components/checkout/MercadoPagoCardBrick";
import { payOrderWithMercadoPagoCard } from "@/actions/mercadopago-card";
import type { PaymentMethodTitles } from "@/lib/payments/method-titles";
import CheckoutUpsell from "@/components/checkout/CheckoutUpsell";
import {
  getCartRecommendations,
  type RecommendationCard,
} from "@/actions/recommendations";

/**
 * Método tal como se guarda en BD (enum `PaymentMethod` de Prisma).
 *
 * `MERCADOPAGO_CARD` existe solo en la interfaz: es el MISMO procesador, la
 * misma cuenta y el mismo webhook que `MERCADOPAGO`; lo único que cambia es
 * dónde teclea la tarjeta el comprador. Guardarlo como un método distinto
 * obligaría a migrar el enum y a auditar cada `switch` sobre paymentMethod
 * (correos, SUNAT, panel, reportes) para no ganar nada: el detalle real del
 * cobro ya queda en `paymentDetails.paymentMethodId` ("visa", "master"…).
 */
function toDbPaymentMethod(
  method: CheckoutPaymentMethod
): "YAPE" | "PLIN" | "CARD" | "PAYPAL" | "MERCADOPAGO" {
  return method === "MERCADOPAGO_CARD" ? "MERCADOPAGO" : method;
}

const initialFormData = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerDni: "",
  address: "",
  reference: "",
  paymentMethod: "YAPE" as CheckoutPaymentMethod,
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
  /** Títulos de cada método configurados en el admin. */
  paymentTitles: PaymentMethodTitles;
}

export default function CheckoutPageClient({
  siteName,
  siteLogo,
  sunatEnabled,
  pricesIncludeIgv,
  departments,
  enabledMethods,
  paymentTitles,
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

  // Botón "Atrás" desde la pasarela: si el navegador restaura el checkout desde
  // el bfcache, los flags de navegación quedarían en true y mostraríamos la
  // pantalla "Redirigiendo…" (o el botón en "Procesando…") pegada. Los
  // reseteamos al volver para que el carrito se vea normal, como en Shopify.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setIsRedirecting(false);
        setLoading(false);
        setIsProcessingPayment(false);
        processingRef.current = false;
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  
  // Clave del intento de compra actual. Va en un ref para sobrevivir a los
  // re-renders sin provocarlos, y se mantiene ESTABLE mientras el intento
  // fracase: ésa es justamente la condición para que un reintento tras un
  // error de red recupere el pedido ya creado en vez de duplicarlo. Sólo se
  // rota tras un pedido creado con éxito, para que la siguiente compra sea
  // una operación distinta.
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const rotateIdempotencyKey = () => {
    idempotencyKeyRef.current = crypto.randomUUID();
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [stockVerified, setStockVerified] = useState(false);
  const [stockCheckLoading, setStockCheckLoading] = useState(false);
  const [culqiToken, setCulqiToken] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // Saliendo hacia una pasarela externa (MP/PayPal). Mientras navega el
  // navegador, vaciamos el carrito; sin este flag el render mostraría
  // "Tu carrito está vacío" por una fracción de segundo (parpadeo feo).
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { trackEvent } = useTracking(); 
  
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null);

  // La detección de teclado móvil (`keyboardOpen`) y el colapso de la alerta
  // "Falta completar" existían solo para mantener baja la barra de pago fija.
  // Al pasar el CTA al flujo del documento dejaron de tener función.

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

  // Controlador del Card Payment Brick. Lo llena el componente al montarse y lo
  // usa el CTA de pago para pedirle los datos de la tarjeta (`getFormData`).
  const mpBrickRef = useRef<MercadoPagoBrickController | null>(null);

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
        idempotencyKey: idempotencyKeyRef.current,
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

      // El pedido existe: el siguiente intento de compra debe ser una
      // operación nueva, no un reintento de éste.
      rotateIdempotencyKey();

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

      // Tarjeta de MercadoPago: tokenizar ANTES de crear el pedido. `getFormData`
      // valida el formulario y falla si la tarjeta está incompleta; hacerlo
      // después dejaría un pedido con stock reservado por cada dígito mal
      // tecleado.
      let mpCardData: Awaited<ReturnType<MercadoPagoBrickController["getFormData"]>> | null =
        null;
      if (formData.paymentMethod === "MERCADOPAGO_CARD") {
        if (!mpBrickRef.current) {
          setError(
            "El formulario de tarjeta aún no está listo. Espera un momento e intenta de nuevo."
          );
          setLoading(false);
          return;
        }
        try {
          mpCardData = await mpBrickRef.current.getFormData();
        } catch {
          // El Brick ya marca en rojo el campo que falta: aquí solo evitamos
          // seguir adelante.
          setError("Revisa los datos de tu tarjeta e intenta nuevamente.");
          setLoading(false);
          return;
        }
        if (!mpCardData?.token) {
          setError("Revisa los datos de tu tarjeta e intenta nuevamente.");
          setLoading(false);
          return;
        }
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
        idempotencyKey: idempotencyKeyRef.current,
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
        paymentMethod: toDbPaymentMethod(formData.paymentMethod),
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

      // El pedido existe: el siguiente intento debe ser una operación nueva.
      rotateIdempotencyKey();

      const tokenQs = `?token=${result.viewToken}`;

      if (mpCardData && result.orderId) {
        // Cobro con tarjeta SIN salir de la tienda. El importe lo pone el
        // servidor a partir de `order.total`; de aquí solo viaja el token.
        const payment = await payOrderWithMercadoPagoCard({
          orderId: result.orderId,
          viewToken: result.viewToken,
          card: mpCardData,
        });

        if (payment.status === "rejected" || payment.status === "error") {
          // El pedido queda vivo con el pago FAILED: el comprador puede probar
          // otra tarjeta u otro método sin volver a llenar la dirección.
          setError(payment.message ?? "No pudimos procesar tu tarjeta.");
          setLoading(false);
          return;
        }

        // Aprobado o en verificación: en ambos casos el pedido ya existe y el
        // dinero está en camino, así que el carrito deja de tener sentido.
        clearCart();
        clearPersistedData();
        router.push(`/orden/${result.orderId}/confirmacion${tokenQs}`);
        return;
      }

      if (result.paymentMethod === "YAPE" || result.paymentMethod === "PLIN") {
        clearCart();
        clearPersistedData();
        router.push(`/orden/${result.orderId}/pago-pendiente${tokenQs}`);
      } else if (
        result.paymentMethod === "MERCADOPAGO" ||
        result.paymentMethod === "PAYPAL"
      ) {
        // Redirección DIRECTA a la pasarela — sin página intermedia. Creamos la
        // preferencia (MP) / orden (PayPal) en el servidor y saltamos a su
        // pantalla segura. Si falla, caemos a la página puente que muestra el
        // error con opción de reintento (no perdemos el manejo de errores).
        const gateway = await startGatewayCheckout(result.orderId!, result.viewToken);
        if (gateway.success && gateway.redirectUrl) {
          // NO vaciamos el carrito aquí: el cliente todavía no pagó. Si se
          // arrepiente y vuelve atrás desde la pasarela, conserva su carrito y
          // sus datos (igual que Shopify). El carrito se vacía recién en la
          // página de confirmación, cuando ya volvió de pagar.
          setIsRedirecting(true);
          window.location.href = gateway.redirectUrl;
          return; // navegando fuera del sitio: no reseteamos loading
        }
        const bridge =
          result.paymentMethod === "MERCADOPAGO" ? "pago-mercadopago" : "pago-paypal";
        router.push(`/orden/${result.orderId}/${bridge}${tokenQs}`);
      } else {
        clearCart();
        clearPersistedData();
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

  // Saliendo hacia la pasarela: pantalla de transición. Va ANTES del check de
  // carrito vacío porque ya vaciamos el carrito justo antes de navegar.
  if (isRedirecting) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-md text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">Redirigiendo al pago seguro…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Te estamos llevando a la pasarela. No cierres esta ventana.
          </p>
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
  /**
   * Resumen del pedido. Se dibuja hasta tres veces (cabecera plegable móvil,
   * bloque inferior móvil, tarjeta lateral desktop), así que el cupón es
   * opcional: la cabecera móvil es solo un vistazo a totales y aplicar el
   * cupón vive en un único sitio por breakpoint.
   */
  const renderOrderSummary = ({ showCoupon = true }: { showCoupon?: boolean } = {}) => (
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

      {showCoupon && (
        <>
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
        </>
      )}

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

  /**
   * CTA de pago. Móvil y desktop renderizan exactamente este bloque, así que
   * comparten aviso de validación, altura, `checkoutPayButtonClass` y — lo que
   * antes divergía — las mismas condiciones de `disabled`: la variante móvil no
   * exigía aceptar términos ni mostraba spinner al procesar.
   */
  const renderPayCta = (scope: "mobile" | "desktop") => (
    <div className="space-y-3">
      {formData.paymentMethod === "CARD" &&
        (missingRequirements.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex gap-2">
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-sm font-bold text-amber-900">Para continuar:</p>
                <ul className="space-y-0.5 text-xs text-amber-800">
                  {missingRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="font-bold text-amber-600">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 border-amber-400 text-xs font-semibold text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                  onClick={scrollToFirstMissing}
                >
                  Ir al primer campo →
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600"
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-900">¡Todo listo!</p>
                <p className="mt-1 text-xs text-green-800">
                  Completa tu pago de forma segura.
                </p>
              </div>
            </div>
          </div>
        ))}

      {formData.paymentMethod === "CARD" ? (
        <CulqiCheckoutButton
          key={`culqi-${scope}-${formData.customerEmail}-${formData.acceptTerms}`}
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
          className={`${checkoutPayButtonSizeClass} ${checkoutPayButtonClass}`}
          siteName={siteName}
          siteLogo={siteLogo}
        />
      ) : (
        <Button
          type="submit"
          variant="cta"
          size="lg"
          className={`${checkoutPayButtonSizeClass} ${checkoutPayButtonClass}`}
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Procesando...
            </>
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

      {/* ✅ STACK FLOTANTE DE AVISOS
          Ambos avisos comparten un solo contenedor fijo para que no se solapen
          cuando coinciden (p. ej. error del servidor + campos faltantes).
          El error solo se muestra aquí en desktop: en móvil se renderiza dentro
          de la barra de pago fija, pegado al CTA que lo disparó. */}
      <div className="pointer-events-none fixed top-4 left-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 space-y-2">
        {error && (
          <CheckoutErrorBanner
            message={error}
            onDismiss={() => setError(null)}
            className="pointer-events-auto hidden lg:flex"
          />
        )}

        {showMissingAlert && missingRequirements.length > 0 && formData.paymentMethod === "CARD" && (
        <div
          role="alert"
          aria-live="assertive"
          className="pointer-events-auto animate-in slide-in-from-top-5"
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
      </div>

      {/* Cabecera móvil, al estilo de la referencia: una barra sobria con
          "Resumen del pedido", chevron y el total a la derecha. Es un vistazo
          rápido — el resumen completo (con cupón) vive al final del flujo. */}
      <div className="lg:hidden sticky top-0 z-40 border-b bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-expanded={mobileSheetOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent/40 active:bg-accent/60"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                <ShoppingBag className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                <span className="truncate">
                  {mobileSheetOpen ? "Ocultar" : "Mostrar"} resumen del pedido
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 opacity-70 transition-transform ${mobileSheetOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </span>
              <span className="shrink-0 text-base font-semibold tabular-nums">
                {formatPrice(total)}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="top" className="max-h-[85vh] overflow-y-auto px-4 sm:px-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle>Resumen del Pedido</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-6">
              {renderOrderSummary({ showCoupon: false })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="w-full bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-8 lg:pb-12">
          <form onSubmit={handleSubmit} className="checkout-form w-full">
            {/* El error NO se renderiza aquí a propósito: quedaba fuera de
                pantalla cuando se dispara desde el CTA (paybar fija en móvil,
                tarjeta de resumen en desktop). Vive en el stack flotante
                superior y dentro de la paybar móvil. */}
            <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 w-full">
              <div className="lg:col-span-2 space-y-6 min-w-0">
                {/* Información del Cliente */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 min-w-0">
                    {/* Los `autocomplete` llevan prefijo de sección ("shipping"
                        aquí, "billing" en los datos de factura). Sin él, el
                        navegador trata cada campo por separado; con él agrupa
                        nombre + email + teléfono + dirección en un perfil y
                        ofrece autorrellenar todo el bloque de una vez. */}
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
                        autoComplete="shipping name"
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
                        autoComplete="shipping email"
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
                        autoComplete="shipping tel"
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
                      autoComplete="shipping address-line1"
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
                      autoComplete="shipping address-line2"
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
                            autoComplete="billing organization"
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
                            autoComplete="billing street-address"
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
                    <CardTitle>Pago</CardTitle>
                    <CardDescription>
                      Todas las transacciones son seguras y están encriptadas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 min-w-0">
                    <PaymentMethodSelector
                      selectedMethod={formData.paymentMethod}
                      initialEnabledMethods={enabledMethods}
                      initialTitles={paymentTitles}
                      onMethodChange={(method) => {
                        setFormData({ ...formData, paymentMethod: method });
                        setCulqiToken(null);
                        processingRef.current = false;
                        setShowMissingAlert(false);
                      }}
                      disabled={loading || isProcessingPayment}
                      panelExtras={{
                        MERCADOPAGO_CARD: (
                          <MercadoPagoCardBrick
                            amount={total}
                            payerEmail={formData.customerEmail}
                            controllerRef={mpBrickRef}
                            disabled={loading || isProcessingPayment}
                          />
                        ),
                      }}
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

                {/* Resumen del pedido — móvil, al final del flujo como en la
                    referencia. Es el resumen "real": incluye el cupón, que la
                    cabecera plegable omite para no duplicar el control. */}
                <Card className="lg:hidden min-w-0">
                  <CardHeader>
                    <CardTitle>Resumen del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>{renderOrderSummary()}</CardContent>
                </Card>

                {/* Términos — móvil. En desktop viven en la tarjeta de resumen. */}
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

                {/* CTA de pago — móvil. Ya no flota: vive al final del flujo,
                    como en la referencia. La barra fija tapaba los enlaces del
                    footer legal (por eso `checkout.css` le añadía un
                    `padding-bottom` de compensación, hoy innecesario). */}
                <div className="lg:hidden space-y-2.5">
                  {error && (
                    <CheckoutErrorBanner
                      variant="inline"
                      message={error}
                      onDismiss={() => setError(null)}
                    />
                  )}
                  {renderPayCta("mobile")}
                </div>

                <AcceptedPaymentMarks
                  methods={enabledMethods}
                  size="md"
                  className="py-1 lg:hidden"
                />
              </div>

              {/* Resumen Desktop */}
              <div className="hidden lg:block">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Resumen del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderOrderSummary()}

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

                    {renderPayCta("desktop")}

                    <AcceptedPaymentMarks
                      methods={enabledMethods}
                      size="sm"
                      securityLabel="Pago 100% seguro y encriptado"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
