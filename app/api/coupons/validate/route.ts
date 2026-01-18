import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { code, subtotal } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Código de cupón requerido" },
        { status: 400 }
      );
    }

    // Buscar cupón
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json(
        { error: "Cupón no válido" },
        { status: 404 }
      );
    }

    // Validar estado activo
    if (!coupon.active) {
      return NextResponse.json(
        { error: "Este cupón no está activo" },
        { status: 400 }
      );
    }

    // Validar fecha de inicio
    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) {
      return NextResponse.json(
        { error: "Este cupón aún no está disponible" },
        { status: 400 }
      );
    }

    // Validar fecha de expiración
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Este cupón ha expirado" },
        { status: 400 }
      );
    }

    // Validar límite de usos
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json(
        { error: "Este cupón ha alcanzado su límite de usos" },
        { status: 400 }
      );
    }

    // Validar compra mínima
    if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
      return NextResponse.json(
        {
          error: `Compra mínima de S/ ${Number(coupon.minPurchase).toFixed(
            2
          )} requerida`,
        },
        { status: 400 }
      );
    }

    // Calcular descuento
    let discount = 0;

    if (coupon.type === "PERCENTAGE") {
      discount = (subtotal * Number(coupon.value)) / 100;
      // Aplicar descuento máximo si existe
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
        discount = Number(coupon.maxDiscount);
      }
    } else if (coupon.type === "FIXED_AMOUNT") {
      discount = Number(coupon.value);
      // El descuento no puede ser mayor al subtotal
      if (discount > subtotal) {
        discount = subtotal;
      }
    } else if (coupon.type === "FREE_SHIPPING") {
      discount = 0; // El descuento se aplica al shipping, no al subtotal
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        discount: discount,
        description: coupon.description,
      },
    });
  } catch (error) {
    console.error("Error al validar cupón:", error);
    return NextResponse.json(
      { error: "Error al validar cupón" },
      { status: 500 }
    );
  }
}