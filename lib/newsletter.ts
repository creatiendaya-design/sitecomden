import {prisma} from "@/lib/db";

/**
 * Genera un cupón único de bienvenida para newsletter
 */
export async function generateNewsletterWelcomeCoupon(
  email: string
): Promise<{ code: string; discount: number } | null> {
  try {
    // Generar código único basado en timestamp y random
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const couponCode = `BIENVENIDO-${timestamp}-${random}`;

    // Configuración del cupón
    const discountPercentage = 10; // 10% de descuento
    const minPurchase = 100; // Compra mínima de S/. 100
    const validDays = 30; // Válido por 30 días

    // Crear cupón en la base de datos
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    await prisma.coupon.create({
      data: {
        code: couponCode,
        description: `Cupón de bienvenida de 10% para ${email}`,
        type: "PERCENTAGE",
        value: discountPercentage,
        minPurchase,
        usageLimit: 1, // Solo 1 uso
        usageLimitPerUser: 1,
        expiresAt,
        active: true,
      },
    });

    return {
      code: couponCode,
      discount: discountPercentage,
    };
  } catch (error) {
    console.error("Error generando cupón de bienvenida:", error);
    return null;
  }
}