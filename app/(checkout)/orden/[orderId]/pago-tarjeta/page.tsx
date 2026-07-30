import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import CardPaymentClient from "./card-payment-client";
import { canViewOrder } from "@/lib/orders/order-access";
import { canStartPayment } from "@/lib/payments/order-payable";

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PaymentCardPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { token } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Authorization: buyer (access cookie) or holder of the order viewToken only.
  const allowed = await canViewOrder({
    orderId: order.id,
    viewToken: order.viewToken,
    urlToken: token,
  });
  if (!allowed) {
    redirect("/orden/verificar");
  }

  // Si ya está pagada —o el pedido dejó de admitir pagos (cancelado,
  // reembolsado, reserva vencida, cobro en verificación)— no se muestra el
  // formulario de tarjeta: la confirmación explica en qué estado está. El
  // control autoritativo es el claim de `processCardPayment`; esto sólo evita
  // ofrecer un formulario que va a rechazarse.
  if (!canStartPayment(order).canStart) {
    redirect(`/orden/${order.id}/confirmacion`);
  }

  // Si no es método CARD, redirigir apropiadamente
  if (order.paymentMethod !== "CARD") {
    if (order.paymentMethod === "YAPE" || order.paymentMethod === "PLIN") {
      redirect(`/orden/${order.id}/pago-pendiente`);
    } else if (order.paymentMethod === "PAYPAL") {
      redirect(`/orden/${order.id}/pago-paypal`);
    } else if (order.paymentMethod === "MERCADOPAGO") {
      redirect(`/orden/${order.id}/pago-mercadopago`);
    } else {
      redirect(`/orden/${order.id}/confirmacion`);
    }
  }

  return (
    <CardPaymentClient
      orderId={order.id}
      orderNumber={order.orderNumber}
      total={Number(order.total)}
      customerEmail={order.customerEmail}
      viewToken={order.viewToken}
    />
  );
}