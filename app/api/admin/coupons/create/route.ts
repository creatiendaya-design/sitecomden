import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validaciones
    if (!data.code || !data.type) {
      return NextResponse.json(
        { error: "Código y tipo son requeridos" },
        { status: 400 }
      );
    }

    if (data.type !== "FREE_SHIPPING" && !data.value) {
      return NextResponse.json(
        { error: "El valor es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el código no exista
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: data.code },
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
        code: data.code,
        description: data.description || null,
        type: data.type,
        value: data.type === "FREE_SHIPPING" ? 0 : data.value,
        minPurchase: data.minPurchase || null,
        maxDiscount: data.maxDiscount || null,
        usageLimit: data.usageLimit || null,
        usageLimitPerUser: data.usageLimitPerUser || null,
        startsAt: data.startsAt || null,
        expiresAt: data.expiresAt || null,
        active: data.active ?? true,
      },
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Error al crear cupón:", error);
    return NextResponse.json(
      { error: "Error al crear cupón" },
      { status: 500 }
    );
  }
}