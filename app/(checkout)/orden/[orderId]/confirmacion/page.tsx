import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/site-settings";
import { notFound, redirect } from "next/navigation";
import { formatPrice, displayOrderNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Package,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  Clock,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import type { Metadata } from "next";
import { CustomDesignConfirmation } from "@/components/checkout/CustomDesignConfirmation";
import { checkoutPayButtonClass } from "@/components/checkout/pay-button-class";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";
import { canViewOrder } from "@/lib/orders/order-access";
import ClearCartOnConfirmation from "./ClearCartOnConfirmation";
import ConfirmMercadoPagoOnReturn from "./ConfirmMercadoPagoOnReturn";

interface ShippingAddressJson {
  address?: string;
  district?: string;
  city?: string;
  reference?: string;
}

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{
    token?: string;
    // MercadoPago añade estos al redirigir de vuelta tras el pago.
    payment_id?: string;
    collection_id?: string;
  }>;
}

const PAYMENT_LABELS: Record<string, string> = {
  CARD: "Tarjeta de crédito / débito",
  YAPE: "Yape",
  PLIN: "Plin",
  PAYPAL: "PayPal",
  MERCADOPAGO: "Mercado Pago",
  COD: "Pago contra entrega",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, orderSeq: true },
  });

  if (!order) {
    return {
      title: "Orden no encontrada",
    };
  }

  const settings = await getSiteSettings();
  const orderDisplayNumber = displayOrderNumber(order, settings.order_prefix || "PED");

  return {
    title: `Confirmación de Pedido - ${orderDisplayNumber}`,
    description: `Tu pedido ${orderDisplayNumber} ha sido confirmado exitosamente.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OrderConfirmationPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { token, payment_id, collection_id } = await searchParams;
  const siteSettings = await getSiteSettings();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Authorization: only the buyer (via access cookie) or someone holding the
  // order's viewToken may see this page. Otherwise send them to the secure
  // verify flow (email + token) instead of leaking PII by orderId alone.
  const allowed = await canViewOrder({
    orderId: order.id,
    viewToken: order.viewToken,
    urlToken: token,
  });
  if (!allowed) {
    redirect("/orden/verificar");
  }

  if (order.paymentStatus === "PENDING") {
    if (order.paymentMethod === "YAPE" || order.paymentMethod === "PLIN") {
      redirect(`/orden/${order.id}/pago-pendiente`);
    } else if (order.paymentMethod === "PAYPAL") {
      redirect(`/orden/${order.id}/pago-paypal`);
    }
  }

  const isPaid = order.paymentStatus === "PAID";
  const isPending = order.paymentStatus === "PENDING";

  // Confirmación por retorno: si volvemos de MercadoPago con un payment_id y la
  // orden aún no está pagada (el webhook no llegó —típico en localhost— o se
  // retrasó), un componente cliente la verifica y refresca. Reverificación real
  // contra la API en el server action, así que es seguro e idempotente.
  const mpReturnPaymentId =
    order.paymentMethod === "MERCADOPAGO" && !isPaid
      ? (payment_id ?? collection_id ?? null)
      : null;
  const whatsappNumber = siteSettings.contact_phone.replace(/\D/g, "");
  // Número de orden mostrado al cliente (mismo formato que el admin / verificar):
  // secuencial con prefijo (PED-0001) o, para órdenes legacy sin orderSeq, el cuid.
  const orderDisplayNumber = displayOrderNumber(order, siteSettings.order_prefix || "PED");

  const shippingAddress = order.shippingAddress as ShippingAddressJson | string | null;
  const addressLine =
    typeof shippingAddress === "object" && shippingAddress !== null
      ? [shippingAddress.address, shippingAddress.district, shippingAddress.city]
          .filter(Boolean)
          .join(", ")
      : (shippingAddress ?? "");
  const addressReference =
    typeof shippingAddress === "object" && shippingAddress !== null
      ? shippingAddress.reference
      : undefined;

  // Seguimiento: el primer paso ya está hecho (email enviado); el resto, por venir.
  const steps = [
    { title: "Confirmación enviada", desc: "Revisa tu correo con el detalle", done: true },
    { title: "Preparando tu pedido", desc: "Lo alistamos en 24–48 horas", done: false },
    { title: "En camino", desc: "Te compartimos el seguimiento al despachar", done: false },
    { title: "Entregado", desc: "Llega a tu dirección", done: false },
  ];

  const helpHref = `https://wa.me/${whatsappNumber}?text=Hola, tengo una consulta sobre mi orden ${orderDisplayNumber}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* MP/PayPal no vacían el carrito al salir a la pasarela (para preservarlo
          si el cliente vuelve atrás sin pagar). Recién aquí, ya de vuelta, lo
          limpiamos. Los demás métodos ya lo vaciaron al confirmar el pedido. */}
      {(order.paymentMethod === "MERCADOPAGO" || order.paymentMethod === "PAYPAL") && (
        <ClearCartOnConfirmation />
      )}

      {mpReturnPaymentId && <ConfirmMercadoPagoOnReturn paymentId={mpReturnPaymentId} />}

      {/* Ambient brand glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-cta/10 blur-[130px]" />
        <div className="absolute bottom-0 right-[-10%] h-96 w-96 rounded-full bg-emerald-500/[0.06] blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-14 lg:px-8">
        {/* ===================== HERO ===================== */}
        <header className="animate-in fade-in-0 slide-in-from-bottom-3 text-center duration-700">
          <div className="relative mx-auto mb-7 w-fit">
            <div
              className={`absolute inset-0 rounded-full blur-xl ${
                isPaid ? "bg-emerald-500/25" : "bg-cta/25"
              }`}
            />
            <div
              className={`relative flex h-20 w-20 items-center justify-center rounded-full ring-1 ${
                isPaid
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30"
                  : "bg-cta/10 text-cta ring-cta/30"
              }`}
            >
              <CheckCircle2
                className="h-10 w-10 animate-in zoom-in-50 duration-500 delay-200"
                strokeWidth={2.25}
              />
            </div>
          </div>

          <p
            className={`mb-2 text-xs font-semibold uppercase tracking-[0.22em] ${
              isPaid ? "text-emerald-600" : "text-cta"
            }`}
          >
            {isPaid ? "Pago confirmado" : "Pedido recibido"}
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {isPaid ? "¡Gracias por tu compra!" : "¡Recibimos tu pedido!"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-sm text-muted-foreground sm:text-base">
            {isPaid
              ? "Tu pago se procesó correctamente. Ya estamos preparando todo para enviártelo."
              : "Registramos tu pedido y lo estamos procesando. Te avisaremos en cada paso."}
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Orden</span>
            <span className="text-sm font-bold tracking-wide text-foreground">
              {orderDisplayNumber}
            </span>
          </div>
        </header>

        {/* Email bar */}
        <div className="mx-auto mt-7 flex max-w-2xl items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 animate-in fade-in-0 duration-700 delay-150">
          <Mail className="h-4 w-4 shrink-0 text-cta" />
          <p className="text-sm text-muted-foreground">
            Enviamos la confirmación a{" "}
            <span className="font-medium text-foreground">{order.customerEmail}</span>
          </p>
        </div>

        {/* ===================== GRID ===================== */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:items-start">
          {/* ----- LEFT ----- */}
          <div className="space-y-6 lg:col-span-2">
            {/* Productos + resumen */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cta/10 text-cta">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Tu pedido</h2>
                <span className="ml-auto text-sm text-muted-foreground">
                  {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                </span>
              </div>

              <ul className="divide-y divide-border">
                {order.items.map((item) => {
                  const customDesign = item.customDesign as unknown as CustomDesign | null;
                  const customDesignImages =
                    item.customDesignImages as unknown as CustomDesignImage[] | null;
                  return (
                    <li
                      key={item.id}
                      className="px-5 py-4 transition-colors hover:bg-muted/30 sm:px-6"
                    >
                      <div className="flex gap-4">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="64px"
                              // El dominio del snapshot es impredecible (imports de
                              // Shopify u otros CDNs no whitelisted); sin unoptimized
                              // next/image lanzaría en runtime y rompería la página.
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ShoppingBag className="h-6 w-6" />
                            </div>
                          )}
                          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-bold text-background">
                            {item.quantity}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium leading-snug text-foreground">
                            {item.name}
                          </h3>
                          {item.variantName && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatPrice(Number(item.price))} c/u
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatPrice(Number(item.price) * item.quantity)}
                          </p>
                        </div>
                      </div>

                      {customDesign && customDesignImages && customDesignImages.length > 0 && (
                        <CustomDesignConfirmation
                          productName={item.name}
                          design={customDesign}
                          images={customDesignImages}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Resumen — estilo recibo (separador perforado) */}
              <div className="border-t border-dashed border-border bg-muted/30 px-5 py-5 sm:px-6">
                <dl className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-medium text-foreground">
                      {formatPrice(Number(order.subtotal))}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Envío</dt>
                    <dd className="font-medium text-foreground">
                      {Number(order.shipping) === 0
                        ? "Gratis"
                        : formatPrice(Number(order.shipping))}
                    </dd>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <dt>Descuento aplicado</dt>
                      <dd className="font-semibold">−{formatPrice(Number(order.discount))}</dd>
                    </div>
                  )}
                  <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
                    <dt className="text-base font-semibold text-foreground">Total</dt>
                    <dd className="text-2xl font-bold text-cta">
                      {formatPrice(Number(order.total))}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Entrega */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cta/10 text-cta">
                  <Truck className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Entrega</h2>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Destinatario
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Teléfono
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">{order.customerPhone}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Dirección
                  </p>
                  <div className="mt-1.5 flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cta" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{addressLine}</p>
                      {addressReference && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Referencia: {addressReference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {order.shippingMethod && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Método de envío
                    </p>
                    <p className="mt-1 text-sm font-medium capitalize text-foreground">
                      {order.shippingMethod}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ----- RIGHT ----- */}
          <div className="space-y-6">
            {/* Pago */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cta/10 text-cta">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Pago</h2>
                <span
                  className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isPaid
                      ? "bg-emerald-500/10 text-emerald-600"
                      : isPending
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {isPaid && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {isPending && <Clock className="h-3.5 w-3.5" />}
                  {isPaid ? "Pagado" : isPending ? "Pendiente" : "Fallido"}
                </span>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Método
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </p>
                </div>

                {order.paymentId && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      ID de transacción
                    </p>
                    <p className="mt-1 break-all rounded-lg border border-border bg-muted/40 px-2.5 py-2 font-mono text-xs text-muted-foreground">
                      {order.paymentId}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Seguimiento */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cta/10 text-cta">
                  <Clock className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Seguimiento</h2>
              </div>

              <ol className="space-y-1 px-5 py-5">
                {steps.map((step, i) => (
                  <li key={step.title} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {i < steps.length - 1 && (
                      <span className="absolute left-3 top-7 h-[calc(100%-1rem)] w-px bg-border" />
                    )}
                    <span
                      className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        step.done
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground ring-1 ring-border"
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Confianza */}
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm animate-in fade-in-0 duration-700 delay-[400ms]">
              <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-foreground">Compra protegida</p>
                <p className="text-xs text-muted-foreground">Tus datos viajan cifrados con SSL</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== ACCIONES ===================== */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            asChild
            variant="cta"
            size="lg"
            className={`h-12 flex-1 ${checkoutPayButtonClass}`}
          >
            <Link href="/productos" className="flex items-center justify-center gap-2">
              Seguir comprando
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-12 flex-1">
            <Link href="/" className="flex items-center justify-center gap-2">
              Volver al inicio
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 flex-1 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <a
              href={helpHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        </div>

        {/* ===================== AYUDA ===================== */}
        <div className="mt-6 rounded-2xl border border-border bg-muted/30 px-5 py-5 sm:px-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cta/10 text-cta">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  ¿Necesitas ayuda con tu pedido?
                </p>
                <p className="text-xs text-muted-foreground">Escríbenos, te respondemos rápido.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={helpHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                {siteSettings.contact_phone}
              </a>
              <a
                href={`mailto:${siteSettings.contact_email}?subject=Consulta sobre orden ${orderDisplayNumber}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Mail className="h-4 w-4 text-cta" />
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
