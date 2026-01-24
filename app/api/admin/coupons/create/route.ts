import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createCouponSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("coupons.create");
  if (authResponse) return authResponse;

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = createCouponSchema.parse(data);

    // Verificar que el código no exista
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: validatedData.code },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: "Ya existe un cupón con ese código" },
        { status: 400 }
      );
    }

    // Crear cupón
    const coupon = await prisma.coupon.create({
      data: {
        code: validatedData.code,
        description: validatedData.description || null,
        type: validatedData.type,
        value: validatedData.type === "FREE_SHIPPING" ? 0 : validatedData.value,
        minPurchase: validatedData.minPurchase || null,
        maxDiscount: validatedData.maxDiscount || null,
        usageLimit: validatedData.usageLimit || null,
        usageLimitPerUser: validatedData.usageLimitPerUser || null,
        startsAt: validatedData.startsAt || null,
        expiresAt: validatedData.expiresAt || null,
        active: validatedData.active ?? true,
      },
    });

    console.log(`✅ Cupón creado por usuario ${user.id}:`, coupon.code);

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Error al crear cupón:", error);

    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear cupón" },
      { status: 500 }
    );
  }
}