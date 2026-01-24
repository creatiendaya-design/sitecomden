import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { markOrderShippedSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { sendOrderShippedEmail } from "@/lib/email";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("orders.update");
  if (authResponse) return authResponse;

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = markOrderShippedSchema.parse({
      orderId: data.orderId,
      trackingNumber: data.trackingNumber,
      shippingCourier: data.shippingCourier,
      estimatedDelivery: data.estimatedDelivery,
    });

    // Obtener orden
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      select: {
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        viewToken: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que el pago esté confirmado
    if (order.paymentStatus !== "PAID") {
      return NextResponse.json(
        { error: "El pago debe estar confirmado antes de enviar" },
        { status: 400 }
      );
    }

    // Actualizar orden
    await prisma.order.update({
      where: { id: validatedData.orderId },
      data: {
        status: "SHIPPED",
        fulfillmentStatus: "FULFILLED",
        trackingNumber: validatedData.trackingNumber || null,
        shippingCourier: validatedData.shippingCourier || null,
        estimatedDelivery: validatedData.estimatedDelivery
          ? new Date(validatedData.estimatedDelivery)
          : null,
        shippedAt: new Date(),
      },
    });

    console.log(`📦 Orden ${order.orderNumber} marcada como enviada por usuario ${user.id}`);

    // Generar link de visualización
    const viewOrderLink = order.viewToken
      ? `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/orden/verificar?token=${order.viewToken}&email=${order.customerEmail}`
      : '';

    // Enviar email de envío
    try {
      await sendOrderShippedEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        trackingNumber: validatedData.trackingNumber || '',
        shippingCourier: validatedData.shippingCourier || '',
        estimatedDelivery: validatedData.estimatedDelivery || '',
        viewOrderLink: viewOrderLink,
      });
    } catch (emailError) {
      console.error("Error sending shipped email:", emailError);
      // No fallar la actualización si el email falla
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al marcar como enviada:", error);
    
    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}