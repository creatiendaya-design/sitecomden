import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { canViewOrder } from "@/lib/orders/order-access";
import { createCheckoutPreference } from "@/lib/mercadopago/client";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import MercadoPagoRedirectClient from "./mercadopago-redirect-client";

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000";

export default async function PaymentMercadoPagoPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { token } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    notFound();
  }

  // Autorización: comprador (cookie) o portador del viewToken únicamente.
  const allowed = await canViewOrder({
    orderId: order.id,
    viewToken: order.viewToken,
    urlToken: token,
  });
  if (!allowed) {
    redirect("/orden/verificar");
  }

  // Ya pagada → confirmación.
  if (order.paymentStatus === "PAID") {
    redirect(`/orden/${order.id}/confirmacion?token=${order.viewToken}`);
  }

  // Método incorrecto → redirigir al flujo correspondiente.
  if (order.paymentMethod !== "MERCADOPAGO") {
    if (order.paymentMethod === "CARD") {
      redirect(`/orden/${order.id}/pago-tarjeta?token=${order.viewToken}`);
    } else if (order.paymentMethod === "YAPE" || order.paymentMethod === "PLIN") {
      redirect(`/orden/${order.id}/pago-pendiente?token=${order.viewToken}`);
    } else if (order.paymentMethod === "PAYPAL") {
      redirect(`/orden/${order.id}/pago-paypal?token=${order.viewToken}`);
    } else {
      redirect(`/orden/${order.id}/confirmacion?token=${order.viewToken}`);
    }
  }

  const settings = await getSiteSettings();
  const orderDisplayNumber = displayOrderNumber(order, settings.order_prefix || "PED");

  const preference = await createCheckoutPreference({
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderDisplayNumber,
    total: Number(order.total),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    viewToken: order.viewToken,
    baseUrl: APP_URL,
  });

  return (
    <MercadoPagoRedirectClient
      orderDisplayNumber={orderDisplayNumber}
      total={Number(order.total)}
      redirectUrl={preference.success ? preference.redirectUrl ?? null : null}
      error={preference.success ? null : preference.error ?? "No se pudo iniciar el pago."}
    />
  );
}
