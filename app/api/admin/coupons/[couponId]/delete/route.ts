import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("coupons.delete");
  if (authResponse) return authResponse;

  try {
    const { couponId } = await params;

    console.log(`🗑️ Eliminando cupón ${couponId} por usuario ${user.id}`);

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Cupón no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si el cupón ha sido usado (opcional)
    const usedCount = await prisma.order.count({
      where: { couponCode: coupon.code },
    });

    if (usedCount > 0) {
      console.log(
        `⚠️ Advertencia: Eliminando cupón usado en ${usedCount} órdenes`
      );
    }

    await prisma.coupon.delete({
      where: { id: couponId },
    });

    console.log(`✅ Cupón eliminado por usuario ${user.id}:`, coupon.code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar cupón:", error);
    return NextResponse.json(
      { error: "Error al eliminar cupón" },
      { status: 500 }
    );
  }
}