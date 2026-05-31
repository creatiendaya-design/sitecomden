import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRateLimit, couponRateLimiter } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimitResponse = await withRateLimit(request, couponRateLimiter, {
    action: "coupon_validate",
    errorMessage: "Demasiados intentos. Espera un momento antes de intentar otro cupón.",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { code, subtotal } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Código de cupón requerido" },
        { status: 400 }
      );
    }

    // Buscar cupón. Para no permitir ENUMERACIÓN de códigos, todos los casos de
    // "no aplicable" (inexistente, inactivo, fuera de fecha, sin cupos) devuelven
    // el MISMO mensaje genérico y el mismo status. La única excepción es la
    // compra mínima, porque es una pista accionable y legítima para el cliente.
    const GENERIC = { error: "Cupón inválido o no aplicable" };
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    const now = new Date();
    const notApplicable =
      !coupon ||
      !coupon.active ||
      (coupon.startsAt && new Date(coupon.startsAt) > now) ||
      (coupon.expiresAt && new Date(coupon.expiresAt) < now) ||
      (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit);

    if (notApplicable) {
      return NextResponse.json(GENERIC, { status: 400 });
    }

    // Validar compra mínima (mensaje específico permitido: es una guía útil).
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