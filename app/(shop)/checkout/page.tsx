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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const initialFormData = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  customerDni: "",
  address: "",
  reference: "",
  paymentMethod: "YAPE" as const,
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [stockVerified, setStockVerified] = useState(false);
  const [stockCheckLoading, setStockCheckLoading] = useState(false);
  
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
      verifyStockBeforeCheckout();
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
      variantId: item.variantId,
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

      // Verificar stock una última vez
      const stockItems = items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const stockResult = await checkCartStock(stockItems);

      if (!stockResult.success) {
        setError("Algunos productos ya no tienen stock disponible. Por favor revisa tu carrito.");
        setLoading(false);
        return;
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

      // Guardar ID de orden
      setCreatedOrderId(result.orderId);

      // Si es pago con tarjeta, mostrar formulario inline
      if (result.paymentMethod === "CARD") {
        setShowPaymentForm(true);
        setLoading(false);
        return;
      }

      // Para otros métodos, limpiar carrito y datos persistidos
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

  const handlePaymentSuccess = async (culqiToken: string) => {
    if (!createdOrderId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await processCardPayment({
        orderId: createdOrderId,
        culqiToken,
        email: formData.customerEmail,
      });

      if (!result.success) {
        setError(result.error || "Error al procesar el pago");
        setLoading(false);
        return;
      }

      clearCart();
      clearPersistedData();
      router.push(`/orden/${createdOrderId}/confirmacion`);
    } catch (error) {
      setError("Error al procesar el pago");
      setLoading(false);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setLoading(false);
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

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      <form onSubmit={handleSubmit}>
        {/* Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stockVerified && !error && (
          <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              Stock verificado. Todos los productos están disponibles.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Formulario */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="customerName">
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
                  <div>
                    <Label htmlFor="customerDni">
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
                  <div>
                    <Label htmlFor="customerEmail">
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
                  <div>
                    <Label htmlFor="customerPhone">
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
            <Card>
              <CardHeader>
                <CardTitle>Dirección de Envío</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selector de Ubicación - SIN props de envío */}
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
                <div>
                  <Label htmlFor="address">
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
                <div>
                  <Label htmlFor="reference">Referencia (opcional)</Label>
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
            <Card>
              <CardHeader>
                <CardTitle>Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMethod: value as any })
                  }
                >
                  <div className="flex items-center space-x-2 rounded-lg border p-4">
                    <RadioGroupItem value="YAPE" id="yape" />
                    <Label htmlFor="yape" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Yape</div>
                      <div className="text-sm text-muted-foreground">
                        Transferencia instantánea • 0% comisión
                      </div>
                    </Label>
                    <Badge variant="secondary">Recomendado</Badge>
                  </div>

                  <div className="flex items-center space-x-2 rounded-lg border p-4">
                    <RadioGroupItem value="PLIN" id="plin" />
                    <Label htmlFor="plin" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Plin</div>
                      <div className="text-sm text-muted-foreground">
                        Transferencia instantánea • 0% comisión
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 rounded-lg border p-4">
                    <RadioGroupItem value="CARD" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Tarjeta de Crédito/Débito</div>
                      <div className="text-sm text-muted-foreground">
                        Visa, Mastercard (Culqi)
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 rounded-lg border p-4">
                    <RadioGroupItem value="PAYPAL" id="paypal" />
                    <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                      <div className="font-semibold">PayPal</div>
                      <div className="text-sm text-muted-foreground">
                        Pago internacional seguro
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Notas Adicionales */}
            <Card>
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
                />
              </CardContent>
            </Card>

            {/* Términos y Condiciones */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="acceptTerms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, acceptTerms: checked === true })
                      }
                      className={validationErrors.acceptTerms ? "border-destructive" : ""}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="acceptTerms"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Acepto los{" "}
                        <TermsAndConditions>
                          <span className="text-primary underline cursor-pointer">
                            términos y condiciones
                          </span>
                        </TermsAndConditions>
                        {" "}<span className="text-destructive">*</span>
                      </Label>
                      {validationErrors.acceptTerms && (
                        <p className="text-xs text-destructive">
                          {validationErrors.acceptTerms}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de Orden */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-slate-100">
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium line-clamp-1">{item.name}</p>
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">
                            {item.variantName}
                          </p>
                        )}
                        <p className="mt-1 text-muted-foreground">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Cupón de descuento */}
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

                <Separator />

                {/* Totales */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Descuento</span>
                      <span className="text-green-600">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Envío
                      {selectedShippingRate && (
                        <span className="text-xs block">
                          {selectedShippingRate.name}
                          {selectedShippingRate.estimatedDays && (
                            <> • {selectedShippingRate.estimatedDays}</>
                          )}
                        </span>
                      )}
                    </span>
                    <span>
                      {appliedCoupon?.type === "FREE_SHIPPING" || selectedShippingRate?.isFree ? (
                        <span className="text-green-600">¡Gratis!</span>
                      ) : selectedShippingRate ? (
                        formatPrice(selectedShippingRate.finalCost)
                      ) : (
                        <span className="text-xs text-muted-foreground">Selecciona método</span>
                      )}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    loading || 
                    showPaymentForm || 
                    !stockVerified || 
                    stockCheckLoading || 
                    !selectedShippingRate
                  }
                >
                  {loading ? "Procesando..." : 
                   stockCheckLoading ? "Verificando stock..." :
                   !selectedShippingRate ? "Selecciona método de envío" :
                   "Confirmar Pedido"}
                </Button>

                {/* Mostrar formulario de pago con tarjeta si corresponde */}
                {showPaymentForm && createdOrderId && (
                  <div className="mt-6">
                    <CulqiPaymentForm
                      amount={total}
                      email={formData.customerEmail}
                      orderId={createdOrderId}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  🔒 Pago 100% seguro y encriptado
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}