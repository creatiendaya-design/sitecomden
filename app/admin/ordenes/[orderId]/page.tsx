export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { formatPrice, formatOrderNumber } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, FileText, MapPin, Package, User } from "lucide-react";
import Image from "next/image";
import CopyLinkButton from "./copy-link-button";
import { EmitDocumentButton, ResendComprobanteButton } from "./EmitDocumentButton";
import OrderStatusCard from "./OrderStatusCard";
import FulfillmentCard from "./FulfillmentCard";
import AdminNotesCard from "./AdminNotesCard";
import MoreActionsMenu from "./MoreActionsMenu";
import PaymentBanner from "./PaymentBanner";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
} from "@/lib/order-status-logic";
import { CustomDesignViewer } from "@/components/admin/orders/CustomDesignViewer";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

function getStatusPillClass(status: string): string {
  const green = ["PAID", "DELIVERED", "FULFILLED", "ISSUED"];
  const amber = ["PENDING", "VERIFYING", "PROCESSING", "UNFULFILLED", "PARTIAL"];
  const red = ["CANCELLED", "FAILED", "ERROR"];
  const blue = ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
  const slate = ["REFUNDED"];

  if (green.includes(status)) return "bg-green-100 text-green-700";
  if (amber.includes(status)) return "bg-amber-100 text-amber-700";
  if (red.includes(status)) return "bg-red-100 text-red-700";
  if (blue.includes(status)) return "bg-blue-100 text-blue-700";
  if (slate.includes(status)) return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;

  const siteSettings = await getSiteSettings();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: { select: { id: true, sku: true, options: true, image: true } },
        },
      },
      pendingPayment: true,
      electronicDocument: true,
    },
  });

  if (!order) notFound();

  const shippingAddress = order.shippingAddress as any;
  if (!shippingAddress || typeof shippingAddress !== "object") {
    return notFound();
  }
  const orderPrefix = siteSettings.order_prefix || "PED";
  const baseUrl = siteSettings.site_url || "http://localhost:3000";
  const orderDisplayNumber = (order as any).orderSeq
    ? formatOrderNumber((order as any).orderSeq, orderPrefix)
    : `#${order.orderNumber.slice(-8).toUpperCase()}`;
  const viewLink = order.viewToken
    ? `${baseUrl}/orden/verificar?token=${order.viewToken}&email=${order.customerEmail}`
    : null;

  const showSunatBanner =
    !!order.documentType &&
    order.paymentStatus === "PAID" &&
    (!order.electronicDocument || order.electronicDocument.status !== "ISSUED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/ordenes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{orderDisplayNumber}</h1>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleString("es-PE", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusPillClass(order.status)}`}>
            {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusPillClass(order.paymentStatus)}`}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? order.paymentStatus}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusPillClass((order as any).fulfillmentStatus)}`}>
            {FULFILLMENT_STATUS_LABELS[(order as any).fulfillmentStatus as keyof typeof FULFILLMENT_STATUS_LABELS] ?? (order as any).fulfillmentStatus}
          </span>
          <MoreActionsMenu
            orderId={order.id}
            orderStatus={order.status}
            paymentStatus={order.paymentStatus}
          />
        </div>
      </div>

      {/* Payment verification banner */}
      {order.paymentStatus === "VERIFYING" && order.pendingPayment && (
        <PaymentBanner
          paymentId={order.pendingPayment.id}
          paymentMethod={order.paymentMethod}
          proofImageUrl={order.pendingPayment.proofImage ?? null}
        />
      )}

      {/* SUNAT document pending banner */}
      {showSunatBanner && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-blue-900">
            📄 Comprobante electrónico pendiente de emitir
          </p>
          <EmitDocumentButton orderId={order.id} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column — 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Productos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => {
                  const customDesign = item.customDesign as unknown as CustomDesign | null;
                  const customDesignImages = item.customDesignImages as unknown as CustomDesignImage[] | null;
                  return (
                    <div key={item.id} className="space-y-3">
                      <div className="flex gap-4">
                        {(item.image || item.variant?.image) && (
                          <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                            <Image
                              src={item.image || item.variant?.image || ""}
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
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.quantity} × {formatPrice(Number(item.price))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatPrice(Number(item.price) * item.quantity)}
                          </p>
                        </div>
                      </div>
                      {customDesign && customDesignImages && customDesignImages.length > 0 && (
                        <CustomDesignViewer
                          orderId={order.id}
                          itemId={item.id}
                          design={customDesign}
                          images={customDesignImages}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío:</span>
                  <span>{formatPrice(Number(order.shipping))}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="text-green-600">
                      -{formatPrice(Number(order.discount))}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(Number(order.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Despacho — in main column */}
          <FulfillmentCard
            orderId={order.id}
            currentFulfillmentStatus={(order as any).fulfillmentStatus}
            currentTrackingNumber={order.trackingNumber || ""}
            currentShippingCourier={(order as any).shippingCourier || ""}
          />

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nombre:</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono:</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
              {order.customerDni && (
                <div>
                  <p className="text-sm text-muted-foreground">DNI:</p>
                  <p className="font-medium">{order.customerDni}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección de Envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{shippingAddress.address}</p>
              <p className="text-muted-foreground">
                {shippingAddress.district}, {shippingAddress.city}
              </p>
              <p className="text-muted-foreground">{shippingAddress.department}</p>
              {shippingAddress.reference && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Referencia: {shippingAddress.reference}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notas del cliente */}
          {order.customerNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.customerNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — 1/3 width */}
        <div className="space-y-6">
          {/* Estado de la orden */}
          <OrderStatusCard orderId={order.id} currentStatus={order.status} />

          {/* Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{order.paymentMethod}</p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusPillClass(order.paymentStatus)}`}
              >
                {PAYMENT_STATUS_LABELS[order.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? order.paymentStatus}
              </span>
              {order.paidAt && (
                <p className="text-sm text-muted-foreground">
                  Pagado: {new Date(order.paidAt).toLocaleString("es-PE")}
                </p>
              )}
              {order.paymentStatus === "VERIFYING" && order.pendingPayment?.proofImage && (
                <Button variant="outline" size="sm" className="mt-1" asChild>
                  <a
                    href={order.pendingPayment.proofImage}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver comprobante
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Comprobante electrónico */}
          {order.documentType && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Comprobante Electrónico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.electronicDocument ? (
                  order.electronicDocument.status === "ISSUED" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">Emitido</Badge>
                        <span className="font-mono font-medium text-sm">
                          {order.electronicDocument.fullNumber}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.electronicDocument.issuedAt?.toLocaleString("es-PE")}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {order.electronicDocument.pdfUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={order.electronicDocument.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Descargar PDF
                            </a>
                          </Button>
                        )}
                        {order.electronicDocument.xmlUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={order.electronicDocument.xmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Descargar XML
                            </a>
                          </Button>
                        )}
                        <ResendComprobanteButton orderId={order.id} />
                      </div>
                    </div>
                  ) : order.electronicDocument.status === "ERROR" ? (
                    <div className="space-y-3">
                      <Badge variant="destructive">Error</Badge>
                      <p className="text-sm text-red-600">
                        {order.electronicDocument.errorMessage}
                      </p>
                      <EmitDocumentButton orderId={order.id} />
                    </div>
                  ) : order.electronicDocument.status === "CANCELLED" ? (
                    <div className="space-y-2">
                      <Badge className="bg-slate-100 text-slate-600">Cancelado</Badge>
                      <p className="text-sm text-muted-foreground">
                        El comprobante fue cancelado.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>
                      <p className="text-sm text-muted-foreground">
                        {order.documentType === "BOLETA" ? "Boleta de Venta" : "Factura"}
                        {order.documentType === "FACTURA" && order.buyerRuc && (
                          <> — RUC: {order.buyerRuc} ({(order as any).buyerRazonSocial})</>
                        )}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Tipo:{" "}
                      <strong>
                        {order.documentType === "BOLETA" ? "Boleta de Venta" : "Factura"}
                      </strong>
                      {order.documentType === "FACTURA" && order.buyerRuc && (
                        <> — RUC: {order.buyerRuc} ({(order as any).buyerRazonSocial})</>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notas internas */}
          <AdminNotesCard
            orderId={order.id}
            currentAdminNotes={(order as any).adminNotes || ""}
          />

          {/* Fechas importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Fechas importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Creada</p>
                <p className="text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString("es-PE")}
                </p>
              </div>
              {order.paidAt && (
                <div>
                  <p className="font-medium">Pagada</p>
                  <p className="text-muted-foreground">
                    {new Date(order.paidAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
              {(order as any).shippedAt && (
                <div>
                  <p className="font-medium">Enviada</p>
                  <p className="text-muted-foreground">
                    {new Date((order as any).shippedAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
              {(order as any).deliveredAt && (
                <div>
                  <p className="font-medium">Entregada</p>
                  <p className="text-muted-foreground">
                    {new Date((order as any).deliveredAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link para cliente */}
          {viewLink && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Link para cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={viewLink}
                    readOnly
                    className="flex-1 text-xs bg-slate-50 border rounded px-2 py-1"
                  />
                  <CopyLinkButton link={viewLink} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
