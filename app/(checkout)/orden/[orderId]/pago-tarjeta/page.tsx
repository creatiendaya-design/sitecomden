import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import CardPaymentClient from "./card-payment-client";

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function PaymentCardPage({ params }: PageProps) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Si ya está pagada, redirigir a confirmación
  if (order.paymentStatus === "PAID") {
    redirect(`/orden/${order.id}/confirmacion`);
  }

  // Si no es método CARD, redirigir apropiadamente
  if (order.paymentMethod !== "CARD") {
    if (order.paymentMethod === "YAPE" || order.paymentMethod === "PLIN") {
      redirect(`/orden/${order.id}/pago-pendiente`);
    } else if (order.paymentMethod === "PAYPAL") {
      redirect(`/orden/${order.id}/pago-paypal`);
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
    />
  );
}