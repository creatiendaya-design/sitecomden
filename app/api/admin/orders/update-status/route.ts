import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { updateOrderStatusSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("orders:update");
  if (authResponse) return authResponse;

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = updateOrderStatusSchema.parse({
      orderId: data.orderId,
      status: data.status,
    });

    // Obtener orden para logging
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      select: {
        orderNumber: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: Prisma.OrderUpdateInput = { status: validatedData.status };

    // Actualizar timestamps según el estado
    if (validatedData.status === "DELIVERED") {
      updateData.deliveredAt = new Date();
      updateData.fulfillmentStatus = "FULFILLED";
    } else if (validatedData.status === "CANCELLED") {
      updateData.cancelledAt = new Date();
    }

    // Actualizar orden
    await prisma.order.update({
      where: { id: validatedData.orderId },
      data: updateData,
    });

    console.log(
      `📝 Orden ${order.orderNumber}: ${order.status} → ${validatedData.status} (por usuario ${user.id})`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    
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