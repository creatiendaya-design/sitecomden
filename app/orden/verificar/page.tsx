"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getOrderByToken } from "@/actions/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

export default function VerificarOrdenPage() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const emailFromUrl = searchParams.get("email");

  const [token, setToken] = useState(tokenFromUrl || "");
  const [email, setEmail] = useState(emailFromUrl || "");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar automáticamente si hay token y email en URL
  useEffect(() => {
    if (tokenFromUrl && emailFromUrl) {
      handleVerify();
    }
  }, []);

  const handleVerify = async () => {
    if (!token || !email) {
      setError("Por favor ingresa tu email y el código de verificación");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getOrderByToken(token, email);

    if (result.success && result.data) {
      setOrder(result.data);
    } else {
      setError(result.error || "No se pudo verificar la orden");
    }

    setLoading(false);
  };

  // Estados visuales
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      PAID: { label: "Pagado", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      PROCESSING: { label: "Procesando", color: "bg-blue-100 text-blue-800", icon: Package },
      SHIPPED: { label: "Enviado", color: "bg-purple-100 text-purple-800", icon: Truck },
      DELIVERED: { label: "Entregado", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: AlertCircle },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const getPaymentStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
      PAID: { label: "Pagado", color: "bg-green-100 text-green-800" },
      FAILED: { label: "Fallido", color: "bg-red-100 text-red-800" },
      VERIFYING: { label: "Verificando", color: "bg-blue-100 text-blue-800" },
      REFUNDED: { label: "Reembolsado", color: "bg-gray-100 text-gray-800" },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Verificar mi Orden</CardTitle>
              <p className="text-center text-muted-foreground">
                Ingresa tu email y el código que recibiste por correo
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Código de Verificación</Label>
                <Input
                  id="token"
                  placeholder="Código recibido por email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  El código se encuentra en el email de confirmación
                </p>
              </div>

              <Button
                onClick={handleVerify}
                disabled={loading || !email || !token}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Ver mi Orden"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const paymentInfo = getPaymentStatusInfo(order.paymentStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Orden #{order.orderNumber}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Realizada el {new Date(order.createdAt).toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge className={statusInfo.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                <Badge className={paymentInfo.color}>{paymentInfo.label}</Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tracking Info */}
        {order.trackingNumber && (
          <Alert>
            <Truck className="h-4 w-4" />
            <AlertDescription>
              <strong>Número de tracking:</strong> {order.trackingNumber}
              {order.shippingCourier && (
                <span className="ml-2">({order.shippingCourier})</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de tu Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TimelineItem
                icon={CheckCircle2}
                title="Orden Recibida"
                date={order.createdAt}
                completed={true}
              />
              <TimelineItem
                icon={CreditCard}
                title="Pago Confirmado"
                date={order.paidAt}
                completed={order.paymentStatus === "PAID"}
              />
              <TimelineItem
                icon={Package}
                title="En Preparación"
                date={order.paidAt}
                completed={["PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)}
              />
              <TimelineItem
                icon={Truck}
                title="Enviado"
                date={order.shippedAt}
                completed={["SHIPPED", "DELIVERED"].includes(order.status)}
              />
              <TimelineItem
                icon={CheckCircle2}
                title="Entregado"
                date={order.deliveredAt}
                completed={order.status === "DELIVERED"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex gap-4">
                  {item.image && (
                    <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.variantName && (
                      <p className="text-sm text-muted-foreground">{item.variantName}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Cantidad: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      S/. {(item.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      S/. {item.price.toFixed(2)} c/u
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>S/. {order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Envío</span>
                <span>S/. {order.shipping.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-S/. {order.discount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>S/. {order.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de Envío y Contacto */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección de Envío
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.shippingAddress.address}</p>
              <p>{order.shippingAddress.district}</p>
              <p>
                {order.shippingAddress.province}, {order.shippingAddress.department}
              </p>
              {order.shippingAddress.reference && (
                <p className="text-muted-foreground">
                  Ref: {order.shippingAddress.reference}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{order.customerEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{order.customerPhone}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  date,
  completed,
}: {
  icon: any;
  title: string;
  date?: string | null;
  completed: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          completed ? "bg-green-100" : "bg-gray-100"
        }`}
      >
        <Icon
          className={`h-5 w-5 ${completed ? "text-green-600" : "text-gray-400"}`}
        />
      </div>
      <div className="flex-1">
        <p className={`font-medium ${completed ? "text-gray-900" : "text-gray-500"}`}>
          {title}
        </p>
        {date && (
          <p className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString("es-PE", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}