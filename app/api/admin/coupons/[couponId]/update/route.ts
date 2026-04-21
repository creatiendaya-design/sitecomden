import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { updateCouponSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("coupons:update");
  if (authResponse) return authResponse;

  try {
    const { couponId } = await params;
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = updateCouponSchema.parse(data);

    console.log(`🔄 Actualizando cupón ${couponId} por usuario ${user.id}`);

    // Si se está actualizando el código, verificar que no exista en otro cupón
    if (validatedData.code) {
      const existingCoupon = await prisma.coupon.findFirst({
        where: {
          code: validatedData.code,
          NOT: { id: couponId },
        },
      });

      if (existingCoupon) {
        return NextResponse.json(
          { error: "Ya existe otro cupón con ese código" },
          { status: 400 }
        );
      }
    }

    // Actualizar cupón
    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        ...(validatedData.code && { code: validatedData.code }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.type && { type: validatedData.type }),
        ...(validatedData.value !== undefined && {
          value: validatedData.type === "FREE_SHIPPING" ? 0 : validatedData.value,
        }),
        ...(validatedData.minPurchase !== undefined && { minPurchase: validatedData.minPurchase }),
        ...(validatedData.maxDiscount !== undefined && { maxDiscount: validatedData.maxDiscount }),
        ...(validatedData.usageLimit !== undefined && { usageLimit: validatedData.usageLimit }),
        ...(validatedData.usageLimitPerUser !== undefined && {
          usageLimitPerUser: validatedData.usageLimitPerUser,
        }),
        ...(validatedData.startsAt !== undefined && { startsAt: validatedData.startsAt }),
        ...(validatedData.expiresAt !== undefined && { expiresAt: validatedData.expiresAt }),
        ...(validatedData.active !== undefined && { active: validatedData.active }),
      },
    });

    console.log(`✅ Cupón actualizado por usuario ${user.id}:`, coupon.code);

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Error al actualizar cupón:", error);

    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al actualizar cupón" },
      { status: 500 }
    );
  }
}