import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getLoyaltySettings } from "@/actions/loyalty";
import { calculateLoyaltyTier } from "./core";
import { ensureCustomerId } from "./link-customer";

/**
 * Contabiliza una compra en el CRM cuando la orden se confirma como PAGADA.
 * Es la ÚNICA fuente que mueve `Customer.totalSpent` / `totalOrders` /
 * `lastPurchaseAt` y otorga puntos de compra. Diseñada para invocarse desde
 * TODOS los flujos de confirmación (Culqi, MercadoPago, PayPal, Yape/Plin,
 * cambio manual de estado).
 *
 * IDEMPOTENTE: usa `Order.customerTier` (que solo este flujo escribe) como
 * marcador. El claim atómico `updateMany(where customerTier=null)` garantiza que
 * webhooks reintentados o flujos concurrentes (webhook + retorno del cliente)
 * contabilicen la compra exactamente una vez.
 *
 * NUNCA lanza: un fallo aquí no debe revertir un pago ya cobrado.
 */
export async function onOrderPaid(orderId: string): Promise<void> {
  try {
    // 1. Cargar la orden. Si ya tiene customerTier, ya fue contabilizada.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        total: true,
        orderNumber: true,
        customerId: true,
        customerTier: true,
        customerEmail: true,
        customerName: true,
        customerPhone: true,
      },
    });
    if (!order || order.customerTier !== null) return;

    // 2. Asegurar que la orden esté enlazada a una ficha de cliente (red de
    //    seguridad para órdenes creadas antes de esta lógica, o COD).
    let customerId = order.customerId;
    if (!customerId) {
      customerId = await ensureCustomerId({
        email: order.customerEmail,
        name: order.customerName,
        phone: order.customerPhone,
      });
      if (customerId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { customerId },
        });
      }
    }
    // Sin cliente (p. ej. COD sin email) no hay nada que contabilizar. No
    // marcamos customerTier para que un reintento con email pueda enlazar.
    if (!customerId) return;

    const settings = await getLoyaltySettings();

    // 3. Claim atómico + escritura de stats dentro de una transacción.
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId! },
        select: { points: true, loyaltyTier: true },
      });
      if (!customer) return;

      const pointsToAward = settings
        ? Math.floor(Number(order.total) * settings.pointsPerSol)
        : 0;
      const newBalance = customer.points + pointsToAward;
      const newTier = settings
        ? calculateLoyaltyTier(newBalance, settings)
        : customer.loyaltyTier;

      // Claim: solo prospera si customerTier seguía null. updateMany toma lock
      // de fila; un flujo concurrente verá count 0 y abortará su transacción.
      const claim = await tx.order.updateMany({
        where: { id: orderId, customerTier: null },
        data: { customerTier: newTier, pointsEarned: pointsToAward },
      });
      if (claim.count === 0) return; // ya contabilizada por otro flujo

      await tx.customer.update({
        where: { id: customerId! },
        data: {
          points: pointsToAward > 0 ? { increment: pointsToAward } : undefined,
          totalPointsEarned:
            pointsToAward > 0 ? { increment: pointsToAward } : undefined,
          loyaltyTier: newTier,
          totalOrders: { increment: 1 },
          totalSpent: { increment: order.total },
          lastPurchaseAt: new Date(),
        },
      });

      if (pointsToAward > 0) {
        await tx.pointTransaction.create({
          data: {
            customerId: customerId!,
            type: "PURCHASE",
            points: pointsToAward,
            description: `Compra orden #${order.orderNumber}`,
            reference: orderId,
            balanceAfter: newBalance,
          },
        });
      }
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/ordenes");
    revalidatePath("/cuenta");
  } catch (error) {
    console.error("onOrderPaid failed for order", orderId, error);
  }
}
