"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createOrder } from "@/actions/orders";
import { processCardPayment } from "@/actions/payments";
import { checkCartStock } from "@/actions/stock";
import { Button } from "@/components/ui/button";
import CulqiPaymentForm from "@/components/shop/CulqiPaymentForm";
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
import { AlertTriangle, ChevronUp, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTracking } from "@/hooks/useTracking";

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
  // Ubicación
  departmentId: "",
  provinceId: "",
  districtCode: "",
  departmentName: "",
  provinceName: "",
  districtName: "",
};

export default function CheckoutPage() {
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
    const { trackEvent } = useTracking(); 
  // Estado para el Sheet del resumen en móvil
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  
  // Estado de método de envío seleccionado
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null);
  
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: number;
    discount: number;
    description: string | null;
  } | null>(null);

  // Verificar stock al cargar
  useEffect(() => {
    if (items.length > 0 && isLoaded) {
      // Verificar stock
      verifyStockBeforeCheckout();

      // Track InitiateCheckout
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

  // Resetear método de envío cuando cambia distrito
  useEffect(() => {
    if (formData.districtCode) {
      setSelectedShippingRate(null);
    }
  }, [formData.districtCode]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      // Validar ubicación
      if (!formData.districtCode) {
        setError("Por favor selecciona departamento, provincia y distrito");
        setValidationErrors({
          district: "Selecciona un distrito",
        });
        setLoading(false);
        return;
      }

      // Validar método de envío seleccionado
      if (!selectedShippingRate) {
        setError("Por favor selecciona un método de envío");
        setLoading(false);
        return;
      }

      // Validar términos aceptados
      if (!formData.acceptTerms) {
        setError("Debes aceptar los términos y condiciones");
        setValidationErrors({
          acceptTerms: "Debes aceptar los términos y condiciones",
        });
        setLoading(false);
        return;
      }

      // Validaciones básicas antes de llamar a createOrder
      if (!formData.customerName || formData.customerName.trim().length < 3) {
        setError("El nombre debe tener al menos 3 caracteres");
        setValidationErrors({
          customerName: "El nombre debe tener al menos 3 caracteres",
        });
        setLoading(false);
        return;
      }

      if (!formData.customerEmail || !formData.customerEmail.includes("@")) {
        setError("Ingresa un email válido");
        setValidationErrors({
          customerEmail: "Ingresa un email válido",
        });
        setLoading(false);
        return;
      }

      if (!formData.customerPhone || formData.customerPhone.length < 9) {
        setError("Ingresa un teléfono válido");
        setValidationErrors({
          customerPhone: "Ingresa un teléfono válido",
        });
        setLoading(false);
        return;
      }

      if (!formData.address || formData.address.trim().length < 10) {
        setError("La dirección debe tener al menos 10 caracteres");
        setValidationErrors({
          address: "La dirección debe tener al menos 10 caracteres",
        });
        setLoading(false);
        return;
      }

      // Si es pago con tarjeta, validar que tenga token
      if (formData.paymentMethod === "CARD" && !culqiToken) {
        setError("Por favor completa los datos de tu tarjeta");
        setLoading(false);
        return;
      }

      // Verificar stock una última vez
      const stockItems = items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
      }));

      const stockResult = await checkCartStock(stockItems);

      if (!stockResult.success) {
        setError("Algunos productos ya no tienen stock disponible. Por favor revisa tu carrito.");
        setLoading(false);
        return;
      }
   if (formData.paymentMethod) {
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
      }
      // Preparar datos de la orden
      const orderData = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim().toLowerCase(),
        customerPhone: formData.customerPhone.trim(),
        customerDni: formData.customerDni.trim() || undefined,
        
        // Dirección
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
        
        // Información de envío del método seleccionado
        shipping: appliedCoupon?.type === "FREE_SHIPPING" ? 0 : selectedShippingRate.finalCost,
        shippingRateId: selectedShippingRate.id,
        shippingMethod: selectedShippingRate.name,
        shippingCarrier: selectedShippingRate.carrier || undefined,
        shippingEstimatedDays: selectedShippingRate.estimatedDays || undefined,
        
        couponCode: appliedCoupon?.code || undefined,
        couponDiscount: appliedCoupon?.discount || 0,
      };

      console.log("Enviando orden:", orderData);

      // Crear orden
      const result = await createOrder(orderData);

      console.log("Resultado de createOrder:", result);

      if (!result.success) {
        setError(result.error || "Error al crear la orden");
        setLoading(false);
        return;
      }

      // Si es pago con tarjeta, procesar el pago con el token
      if (result.paymentMethod === "CARD" && culqiToken) {
        const paymentResult = await processCardPayment({
          orderId: result.orderId!,
          culqiToken,
          email: formData.customerEmail,
        });

        if (!paymentResult.success) {
          setError(paymentResult.error || "Error al procesar el pago");
          setLoading(false);
          return;
        }
      }

      // Limpiar carrito y datos persistidos
      clearCart();
      clearPersistedData();

      // Redirigir según método de pago
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
  };

  // Handler para ShippingOptions
  const handleShippingRateSelect = (rate: ShippingRate | null) => {
    setSelectedShippingRate(rate);
  };

  // Handler cuando Culqi obtiene el token (success)
  const handleCulqiSuccess = (token: string) => {
    setCulqiToken(token);
    setError(null);
  };

  // Handler cuando Culqi tiene un error
  const handleCulqiError = (errorMessage: string) => {
    setError(errorMessage);
    setCulqiToken(null);
  };

  const subtotal = getTotalPrice();
  const discount = appliedCoupon?.discount || 0;
  
  // Usar el costo del método seleccionado
  const finalShippingCost = selectedShippingRate 
    ? (appliedCoupon?.type === "FREE_SHIPPING" ? 0 : selectedShippingRate.finalCost)
    : 0;
    
  const total = subtotal + finalShippingCost - discount;

  if (!isLoaded) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Texto del botón según el método de pago
  const getButtonText = () => {
    if (loading) return "Procesando...";
    if (stockCheckLoading) return "Verificando stock...";
    if (!selectedShippingRate) return "Selecciona método de envío";
    if (formData.paymentMethod === "CARD") {
      return culqiToken ? "Procesar Pago" : "Completa datos de tarjeta";
    }
    return "Confirmar Pedido";
  };

  // Componente de resumen reutilizable
  const OrderSummaryContent = () => (
    <>
      {/* Items */}
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

      {/* Cupón de descuento */}
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

      {/* Totales */}
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
      {/* 📱 HEADER FLOTANTE SUPERIOR - SOLO MÓVIL */}
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

      {/* ✅ CONTENEDOR PRINCIPAL - SIN overflow-x-hidden */}
      <div className="w-full bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-32 lg:pb-12">
          <form onSubmit={handleSubmit} className="w-full">
            {/* Messages */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 w-full">
              {/* Formulario */}
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
                          id="customerName"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleInputChange}
                          placeholder="Juan Pérez"
                          className={validationErrors.customerName ? "border-destructive" : ""}
                        />
                        {validationErrors.customerName && (
                          <p className="text-xs text-destructive mt-1">
                            {validationErrors.customerName}
                          </p>
                        )}
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
                          className={validationErrors.customerDni ? "border-destructive" : ""}
                        />
                        {validationErrors.customerDni && (
                          <p className="text-xs text-destructive mt-1">
                            {validationErrors.customerDni}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <Label htmlFor="customerEmail" className="block mb-2">
                          Email <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="customerEmail"
                          name="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={handleInputChange}
                          placeholder="juan@example.com"
                          className={validationErrors.customerEmail ? "border-destructive" : ""}
                        />
                        {validationErrors.customerEmail && (
                          <p className="text-xs text-destructive mt-1">
                            {validationErrors.customerEmail}
                          </p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Label htmlFor="customerPhone" className="block mb-2">
                          Teléfono/WhatsApp <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="customerPhone"
                          name="customerPhone"
                          type="tel"
                          value={formData.customerPhone}
                          onChange={handleInputChange}
                          placeholder="+51 987654321"
                          className={validationErrors.customerPhone ? "border-destructive" : ""}
                        />
                        {validationErrors.customerPhone && (
                          <p className="text-xs text-destructive mt-1">
                            {validationErrors.customerPhone}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Ejemplo: +51 987654321 o 987654321
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Opt-in */}
                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="acceptWhatsApp"
                        checked={formData.acceptWhatsApp}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, acceptWhatsApp: checked === true })
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="acceptWhatsApp"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Acepto recibir actualizaciones de mi pedido por WhatsApp
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dirección de Envío */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Dirección de Envío</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 min-w-0">
                    {/* Selector de Ubicación */}
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

                    {/* ShippingOptions - Solo se muestra cuando hay distrito */}
                    {formData.districtCode && (
                      <div className="pt-4 border-t">
                        <ShippingOptions
                          districtCode={formData.districtCode}
                          subtotal={subtotal}
                          onSelect={handleShippingRateSelect}
                          selectedRateId={selectedShippingRate?.id}
                        />
                      </div>
                    )}

                    {/* Dirección */}
                    <div className="min-w-0">
                      <Label htmlFor="address" className="block mb-2">
                        Dirección <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Av. Larco 123, Dpto 501"
                        className={validationErrors.address ? "border-destructive" : ""}
                      />
                      {validationErrors.address && (
                        <p className="text-xs text-destructive mt-1">
                          {validationErrors.address}
                        </p>
                      )}
                    </div>

                    {/* Referencia (opcional) */}
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

                {/* Método de Pago - ✅ ACTUALIZADO CON SELECTOR INTELIGENTE */}
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 min-w-0">
                    {/* ✅ NUEVO: Selector inteligente que filtra métodos habilitados */}
                    <PaymentMethodSelector
                      selectedMethod={formData.paymentMethod}
                      onMethodChange={(method) => {
                        setFormData({ ...formData, paymentMethod: method });
                        setCulqiToken(null);
                      }}
                      disabled={loading}
                    />

                    {/* Formulario de tarjeta - ahora FUERA del selector */}
                    {formData.paymentMethod === "CARD" && (
                      <div className="pl-0 sm:pl-10 pr-0 sm:pr-3 mt-3">
                        <CulqiPaymentForm
                          amount={total}
                          email={formData.customerEmail}
                          orderId="temp"
                          onSuccess={handleCulqiSuccess}
                          onError={handleCulqiError}
                        />
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

              {/* 🖥️ RESUMEN DE ORDEN - SOLO DESKTOP */}
              <div className="hidden lg:block">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Resumen del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <OrderSummaryContent />

                    {/* Términos y Condiciones */}
                    <div className="pt-2">
                      <div className="flex items-start space-x-2 rounded-lg border bg-muted/30 p-3">
                        <Checkbox
                          id="acceptTerms"
                          checked={formData.acceptTerms}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, acceptTerms: checked === true })
                          }
                          className={validationErrors.acceptTerms ? "border-destructive mt-1 flex-shrink-0" : "mt-1 flex-shrink-0"}
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
                          {validationErrors.acceptTerms && (
                            <p className="text-xs text-destructive mt-1">
                              {validationErrors.acceptTerms}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón de pago */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={
                        loading || 
                        !stockVerified || 
                        stockCheckLoading || 
                        !selectedShippingRate ||
                        (formData.paymentMethod === "CARD" && !culqiToken)
                      }
                    >
                      {getButtonText()}
                    </Button>

                    {/* Métodos de pago aceptados */}
                    <div className="space-y-2">
                      <p className="text-center text-xs text-muted-foreground">
                        🔒 Pago 100% seguro y encriptado
                      </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Aceptamos:</span>
                        <div className="flex items-center gap-2">
                          <VisaIcon width={28} height={18} className="opacity-70 hover:opacity-100 transition-opacity" />
                          <MastercardIcon width={26} height={16} className="opacity-70 hover:opacity-100 transition-opacity" />
                          <YapeIcon width={24} height={24} className="opacity-70 hover:opacity-100 transition-opacity" />
                          <PlinIcon width={24} height={24} className="opacity-70 hover:opacity-100 transition-opacity" />
                          <PayPalIcon width={26} height={16} className="opacity-70 hover:opacity-100 transition-opacity" />
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

      {/* 📱 BOTÓN FLOTANTE INFERIOR - SOLO MÓVIL */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-2xl safe-area-pb">
        <div className="px-4 py-3 space-y-3">
          {/* Términos en móvil - más compacto pero legible */}
          <div className="flex items-start space-x-2 py-1">
            <Checkbox
              id="acceptTermsMobile"
              checked={formData.acceptTerms}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, acceptTerms: checked === true })
              }
              className={validationErrors.acceptTerms ? "border-destructive mt-1 flex-shrink-0" : "mt-1 flex-shrink-0"}
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

          {/* Botón de pago con precio */}
          <Button
            type="submit"
            size="lg"
            className="w-full text-base font-semibold h-12"
            disabled={
              loading || 
              !stockVerified || 
              stockCheckLoading || 
              !selectedShippingRate ||
              (formData.paymentMethod === "CARD" && !culqiToken)
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
                <span>{formData.paymentMethod === "CARD" ? "Pagar" : "Confirmar"}</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </span>
            )}
          </Button>

          {/* Métodos de pago - versión móvil compacta */}
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