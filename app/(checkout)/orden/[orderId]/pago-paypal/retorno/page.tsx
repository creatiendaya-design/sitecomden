import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { canViewOrder } from "@/lib/orders/order-access";
import { captureAndConfirmPaypalOrder } from "@/lib/paypal/confirm-payment";

interface PageProps {
  params: Promise<{ orderId: string }>;
  // PayPal añade `token` (id de la orden de PayPal) y `PayerID`. Nosotros
  // llevamos el viewToken en `vt` para no chocar con el `token` de PayPal.
  searchParams: Promise<{ token?: string; vt?: string }>;
}

export default async function PaypalReturnPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { token: paypalOrderId, vt } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, viewToken: true, paymentStatus: true },
  });

  if (!order) {
    notFound();
  }

  // Autorización: cookie de acceso (otorgada al crear la orden) o viewToken (vt).
  const allowed = await canViewOrder({
    orderId: order.id,
    viewToken: order.viewToken,
    urlToken: vt,
  });
  if (!allowed) {
    redirect("/orden/verificar");
  }

  const confirmacion = `/orden/${order.id}/confirmacion?token=${order.viewToken}`;
  const retry = `/orden/${order.id}/pago-paypal?token=${order.viewToken}`;

  // Ya pagada (p. ej. el webhook llegó primero).
  if (order.paymentStatus === "PAID") {
    redirect(confirmacion);
  }

  if (!paypalOrderId) {
    redirect(retry);
  }

  const result = await captureAndConfirmPaypalOrder(paypalOrderId);

  // `orphaned` = PayPal sí cobró, pero la orden ya no admitía el pago (fue
  // cancelada mientras el cliente pagaba). NO puede caer al reintento: le
  // ofrecería pagar otra vez algo que ya pagó. Va a la confirmación, que le
  // muestra el estado real del pedido; la reconciliación queda anotada en el
  // pedido para el admin (ver lib/payments/order-payment-state.ts).
  if (
    result.ok &&
    (result.status === "paid" ||
      result.status === "ignored" ||
      result.status === "pending" ||
      result.status === "orphaned")
  ) {
    redirect(confirmacion);
  }

  // Fallida o no verificable → permitir reintento.
  redirect(retry);
}
