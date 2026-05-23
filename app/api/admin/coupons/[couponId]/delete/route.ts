import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit-log";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("coupons:delete");
  if (authResponse) return authResponse;

  try {
    const { couponId } = await params;

    console.log(`🗑️ Soft-eliminando cupón ${couponId} por usuario ${user.id}`);

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
        `⚠️ Cupón usado en ${usedCount} órdenes — soft-delete preserva el código`
      );
    }

    // Soft-delete: tombstone + deactivate. Order.couponCode lookups still resolve.
    await prisma.coupon.update({
      where: { id: couponId },
      data: { deletedAt: new Date(), active: false },
    });

    console.log(`✅ Cupón soft-eliminado por usuario ${user.id}:`, coupon.code);

    await logAudit({
      action: "coupon.soft_deleted",
      userId: user.id,
      userEmail: user.email,
      entityType: "Coupon",
      entityId: couponId,
      before: { code: coupon.code, type: coupon.type },
      metadata: { orderUsageCount: usedCount },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar cupón:", error);
    return NextResponse.json(
      { error: "Error al eliminar cupón" },
      { status: 500 }
    );
  }
}