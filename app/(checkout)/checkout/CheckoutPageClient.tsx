"use client";

import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createOrder } from "@/actions/orders";
import { processCardPayment } from "@/actions/payments";
import { checkCartStock } from "@/actions/stock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AlertTriangle, ChevronUp, ShoppingBag, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
};

interface CheckoutPageClientProps {
  siteName: string;
  siteLogo: string;
}

export default function CheckoutPageClient({ 
  siteName, 
  siteLogo 
}: CheckoutPageClientProps) {
  const router = useRouter();
  const { items, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  const { formData, setFormData, isLoaded, clearPersistedData } = 
    usePersistedCheckoutForm(initialFormData);
  
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
  const locationRef = useRef<HTMLDivElement>(null);
  const shippingRef = useRef<HTMLDivElement>(null);

  const processingRef = useRef(false);

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
    } else if (!formData.customerPhone || formData.customerPhone.length < 9) {
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
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Auto-ocultar la alerta después de 5 segundos
    setTimeout(() => setShowMissingAlert(false), 5000);
  };

  useEffect(() => {
    if (culqiToken && !processingRef.current && formData.paymentMethod === "CARD") {
      console.log('🎯 Token detectado, procesando pago automáticamente...');
      processPaymentAutomatically();
    }
  }, [culqiToken]);

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

  const processPaymentAutomatically = async () => {
    if (processingRef.current) {
      console.log('⚠️ Ya se está procesando un pago, saltando...');
      return;
    }

    processingRef.current = true;
    setIsProcessingPayment(true);
    setError(null);

    try {
      console.log('🚀 Iniciando proceso automático de pago...');

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
        })),
        shipping: appliedCoupon?.type === "FREE_SHIPPING" ? 0 : selectedShippingRate.finalCost,
        shippingRateId: selectedShippingRate.id,
        shippingMethod: selectedShippingRate.name,
        shippingCarrier: selectedShippingRate.carrier || undefined,
        shippingEstimatedDays: selectedShippingRate.estimatedDays || undefined,
        couponCode: appliedCoupon?.code || undefined,
        couponDiscount: appliedCoupon?.discount || 0,
      };

      console.log("📋 Creando orden...");
      const result = await createOrder(orderData);

      if (!result.success) {
        setError(result.error || "Error al crear la orden");
        setIsProcessingPayment(false);
        processingRef.current = false;
        setCulqiToken(null);
        return;
      }

      console.log('💳 Procesando pago con Culqi...');
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

      console.log('✅ Pago procesado exitosamente');

      clearCart();
      clearPersistedData();

      router.push(`/orden/${result.orderId}/confirmacion`);

    } catch (err) {
      console.error("❌ Error en proceso automático:", err);
      setError("Error inesperado al procesar el pago. Por favor intenta nuevamente.");
      setIsProcessingPayment(false);
      processingRef.current = false;
      setCulqiToken(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔵 handleSubmit llamado - método de pago:', formData.paymentMethod);
    
    if (formData.paymentMethod === "CARD") {
      console.log('ℹ️ Método de pago: TARJETA - esperando token de Culqi');
      return;
    }

    console.log('📝 Procesando pedido para:', formData.paymentMethod);
    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
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

      if (!formData.acceptTerms) {
        setError("Debes aceptar los términos y condiciones");
        termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setLoading(false);
        return;
      }

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

      if (!formData.customerPhone || formData.customerPhone.length < 9) {
        setError("Ingresa un teléfono válido");
        phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneRef.current?.focus();
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
        })),
        shipping: appliedCoupon?.type === "FREE_SHIPPING" ? 0 : selectedShippingRate.finalCost,
        shippingRateId: selectedShippingRate.id,
        shippingMethod: selectedShippingRate.name,
        shippingCarrier: selectedShippingRate.carrier || undefined,
        shippingEstimatedDays: selectedShippingRate.estimatedDays || undefined,
        couponCode: appliedCoupon?.code || undefined,
        couponDiscount: appliedCoupon?.discount || 0,
      };

      const result = await createOrder(orderData);

      if (!result.success) {
        setError(result.error || "Error al crear la orden");
        setLoading(false);
        return;
      }

      clearCart();
      clearPersistedData();

      if (result.paymentMethod === "YAPE" || result.paymentMethod === "PLIN") {
        router.push(`/orden/${result.orderId}/pago-pendiente`);
      } else if (result.paymentMethod === "PAYPAL") {
        router.push(`/orden/${result.orderId}/pago-paypal`);
      } else {
        router.push(`/orden/${result.orderId}/confirmacion`);
      }
    } catch (err) {
      console.error("Error al crear orden:", err);
      setError("Error inesperado. Por favor intenta nuevamente.");
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
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
    console.log('🎯 Token recibido de Culqi:', token);
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
  const total = subtotal + finalShippingCost - discount;

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

  if (!isLoaded) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  const OrderSummaryContent = () => (
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
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <Card className="w-[90%] max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg animate-in slide-in-from-top-5">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-2xl border border-red-700 backdrop-blur-sm">
            <div className="p-4 flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="h-6 w-6" />
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
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-accent/50 active:bg-accent transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <ShoppingBag className="h-4 w-4 text-primary" />
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
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          </SheetTrigger>
          <SheetContent side="top" className="h-[85vh] overflow-y-auto px-4 sm:px-6">
            <SheetHeader className="text-left mb-6">
              <SheetTitle>Resumen del Pedido</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pb-6">
              <OrderSummaryContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="w-full bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 lg:pb-12">
          <form onSubmit={handleSubmit} className="w-full">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
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
                      <div className="min-w-0">
                        <Label htmlFor="customerName" className="block mb-2">
                          Nombre Completo <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          ref={nameRef}
                          id="customerName"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleInputChange}
                          placeholder="Juan Pérez"
                          className={validationErrors.customerName ? "border-destructive" : ""}
                        />
                      </div>
                      <div className="min-w-0">
                        <Label htmlFor="customerDni" className="block mb-2">
                          DNI (opcional)
                        </Label>
                        <Input
                          id="customerDni"
                          name="customerDni"
                          value={formData.customerDni}
                          onChange={handleInputChange}
                          placeholder="12345678"
                          maxLength={8}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <Label htmlFor="customerEmail" className="block mb-2">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          ref={emailRef}
                          id="customerEmail"
                          name="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={handleInputChange}
                          placeholder="juan@example.com"
                          className={validationErrors.customerEmail ? "border-destructive" : ""}
                        />
                      </div>
                      <div className="min-w-0">
                        <Label htmlFor="customerPhone" className="block mb-2">
                          Teléfono/WhatsApp <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          ref={phoneRef}
                          id="customerPhone"
                          name="customerPhone"
                          type="tel"
                          value={formData.customerPhone}
                          onChange={handleInputChange}
                          placeholder="+51 987654321"
                          className={validationErrors.customerPhone ? "border-destructive" : ""}
                        />
                      </div>
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
                        value={{
                          departmentId: formData.departmentId,
                          provinceId: formData.provinceId,
                          districtCode: formData.districtCode,
                        }}
                        onChange={handleLocationChange}
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

                    <div className="min-w-0">
                      <Label htmlFor="address" className="block mb-2">
                        Dirección <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        ref={addressRef}
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Av. Larco 123, Dpto 501"
                        className={validationErrors.address ? "border-destructive" : ""}
                      />
                    </div>

                    <div className="min-w-0">
                      <Label htmlFor="reference" className="block mb-2">Referencia (opcional)</Label>
                      <Input
                        id="reference"
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        placeholder="Edificio blanco al lado del banco"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Método de Pago */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 min-w-0">
                    <PaymentMethodSelector
                      selectedMethod={formData.paymentMethod}
                      onMethodChange={(method) => {
                        setFormData({ ...formData, paymentMethod: method });
                        setCulqiToken(null);
                        processingRef.current = false;
                        setShowMissingAlert(false);
                      }}
                      disabled={loading || isProcessingPayment}
                    />

                    {/* ✅ SECCIÓN DE PAGO CON TARJETA CON FEEDBACK MEJORADO */}
                    {formData.paymentMethod === "CARD" && (
                      <div className="pl-0 sm:pl-10 pr-0 sm:pr-3 mt-4 space-y-3">
                        {/* Mostrar requisitos faltantes ANTES del botón */}
                        {missingRequirements.length > 0 && (
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-4 shadow-md">
                            <div className="flex gap-3">
                              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-amber-900 mb-2">Completa estos datos:</p>
                                <ul className="space-y-1 text-sm text-amber-800">
                                  {missingRequirements.map((req, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-amber-600 font-bold">•</span>
                                      <span>{req}</span>
                                    </li>
                                  ))}
                                </ul>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-3 h-8 text-xs border-amber-400 text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-semibold"
                                  onClick={scrollToFirstMissing}
                                >
                                  Ir al primer campo faltante →
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Indicador visual de completitud */}
                        {missingRequirements.length === 0 && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 shadow-md">
                            <div className="flex gap-3 items-start">
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-bold text-green-900">¡Todo listo!</p>
                                <p className="text-sm text-green-800 mt-1">
                                  Puedes ingresar los datos de tu tarjeta de forma segura.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <CulqiCheckoutButton
                          key={`culqi-${formData.customerEmail}-${formData.acceptTerms}`}
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
                        
                        <p className="text-xs text-muted-foreground text-center">
                          🔒 Al hacer clic se abrirá una ventana segura para ingresar los datos de tu tarjeta.
                          Tu pago se procesará automáticamente.
                        </p>
                      </div>
                    )}
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
              </div>

              {/* Resumen Desktop */}
              <div className="hidden lg:block">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Resumen del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <OrderSummaryContent />

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

                    {formData.paymentMethod !== "CARD" && (
                      <Button
                        type="submit"
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
                        <div className="flex items-center gap-2">
                          <VisaIcon width={28} height={18} className="opacity-70" />
                          <MastercardIcon width={26} height={16} className="opacity-70" />
                          <YapeIcon width={24} height={24} className="opacity-70" />
                          <PlinIcon width={24} height={24} className="opacity-70" />
                          <PayPalIcon width={26} height={16} className="opacity-70" />
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

      {/* Botón flotante móvil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-2xl safe-area-pb">
        <div className="px-4 py-3 space-y-3">
          <div ref={termsRef} className="flex items-start space-x-2 py-1">
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
              className="text-xs leading-relaxed cursor-pointer flex-1 block"
            >
              He leído y acepto los <TermsAndConditions>
                <span className="text-primary underline font-medium">
                  términos y condiciones
                </span>
              </TermsAndConditions> de compra <span className="text-destructive">*</span>
            </Label>
          </div>

          {formData.paymentMethod !== "CARD" && (
            <Button
              type="submit"
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

          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
            <VisaIcon width={24} height={16} className="opacity-60" />
            <MastercardIcon width={22} height={14} className="opacity-60" />
            <YapeIcon width={20} height={20} className="opacity-60" />
            <PlinIcon width={20} height={20} className="opacity-60" />
            <PayPalIcon width={22} height={14} className="opacity-60" />
            <span className="text-[10px] text-muted-foreground ml-1">🔒 Seguro</span>
          </div>
        </div>
      </div>
    </>
  );
}