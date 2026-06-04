import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { canViewOrder } from "@/lib/orders/order-access";
import { createPaypalOrder } from "@/lib/paypal/client";
import { readPaypalSettings, convertPenToCharge } from "@/lib/paypal/config";
import { getSiteSettings } from "@/lib/site-settings";
import { displayOrderNumber } from "@/lib/utils";
import PaypalRedirectClient from "./paypal-redirect-client";

interface PageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string; cancel?: string }>;
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000";

export default async function PaymentPayPalPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { token, cancel } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    notFound();
  }

  const allowed = await canViewOrder({
    orderId: order.id,
    viewToken: order.viewToken,
    urlToken: token,
  });
  if (!allowed) {
    redirect("/orden/verificar");
  }

  if (order.paymentStatus === "PAID") {
    redirect(`/orden/${order.id}/confirmacion?token=${order.viewToken}`);
  }

  if (order.paymentMethod !== "PAYPAL") {
    if (order.paymentMethod === "CARD") {
      redirect(`/orden/${order.id}/pago-tarjeta?token=${order.viewToken}`);
    } else if (order.paymentMethod === "YAPE" || order.paymentMethod === "PLIN") {
      redirect(`/orden/${order.id}/pago-pendiente?token=${order.viewToken}`);
    } else if (order.paymentMethod === "MERCADOPAGO") {
      redirect(`/orden/${order.id}/pago-mercadopago?token=${order.viewToken}`);
    } else {
      redirect(`/orden/${order.id}/confirmacion?token=${order.viewToken}`);
    }
  }

  const siteSettings = await getSiteSettings();
  const orderDisplayNumber = displayOrderNumber(order, siteSettings.order_prefix || "PED");

  const paypalSettings = await readPaypalSettings();
  const chargeAmount = convertPenToCharge(Number(order.total), paypalSettings.exchangeRate);

  // Sin tipo de cambio válido no podemos cobrar en la divisa de PayPal.
  if (chargeAmount === null) {
    return (
      <PaypalRedirectClient
        orderDisplayNumber={orderDisplayNumber}
        totalPen={Number(order.total)}
        chargeAmount={null}
        currency={paypalSettings.currency}
        approveUrl={null}
        canceled={cancel === "1"}
        error="PayPal no está disponible en este momento. Contacta a la tienda."
      />
    );
  }

  const created = await createPaypalOrder({
    orderId: order.id,
    orderDisplayNumber,
    amount: chargeAmount,
    currency: paypalSettings.currency,
    viewToken: order.viewToken,
    baseUrl: APP_URL,
    brandName: siteSettings.site_name || "Tienda",
  });

  return (
    <PaypalRedirectClient
      orderDisplayNumber={orderDisplayNumber}
      totalPen={Number(order.total)}
      chargeAmount={chargeAmount}
      currency={paypalSettings.currency}
      approveUrl={created.success ? created.approveUrl ?? null : null}
      canceled={cancel === "1"}
      error={created.success ? null : created.error ?? "No se pudo iniciar el pago."}
    />
  );
}
