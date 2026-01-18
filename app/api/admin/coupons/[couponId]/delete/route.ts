import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  try {
    const { couponId } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Cupón no encontrado" },
        { status: 404 }
      );
    }

    await prisma.coupon.delete({
      where: { id: couponId },
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