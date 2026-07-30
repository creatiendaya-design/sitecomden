"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createCulqiCharge, solesToCents, formatCardInfo } from "@/lib/culqi";
import { revalidatePath } from "next/cache";
import {
  claimOrderAsPaid,
  isDuplicateProviderPayment,
  recordOrphanPayment,
} from "@/lib/payments/order-payment-state";
import {
  canStartPayment,
  NON_PAYABLE_ORDER_STATUS,
} from "@/lib/payments/order-payable";
import { runCulqiPostPaymentEffects } from "@/lib/payments/culqi-post-payment";

/**
 * Procesar pago con tarjeta usando Culqi
 */
export async function processCardPayment(data: {
  orderId: string;
  culqiToken: string;
  email: string;
}) {
  try {
    // 1. Obtener la orden (sólo el importe autoritativo y su identidad; los
    // datos para el correo los relee `runCulqiPostPaymentEffects` DESPUÉS del
    // claim, cuando ya reflejan el pago).
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // 2. Reclamar la orden ANTES de hablar con Culqi.
    //
    // Comprobar `order.paymentStatus !== "PENDING"` y cobrar después es
    // leer-luego-escribir con una llamada que MUEVE DINERO en medio: la ventana
    // entre la comprobación y el UPDATE final es toda la petición HTTP a Culqi
    // (cientos de ms). Dos envíos concurrentes —doble clic, reintento tras un
    // timeout de red— leían ambos PENDING, pasaban ambos la comprobación y
    // generaban DOS cargos reales sobre la misma orden.
    //
    // El claim atómico deja la orden en VERIFYING; sólo un flujo puede
    // ganarlo, y el resto se detiene aquí sin llegar a cobrar.
    //
    // El WHERE no puede ser sólo `paymentStatus: "PENDING"`: una orden CANCELADA
    // conserva ese estado de pago (cancelar no lo cambia a FAILED), así que el
    // claim prosperaba y cobrábamos una tarjeta por un pedido cerrado cuyo stock
    // ya se había devuelto al inventario. El único remedio después era un
    // reembolso manual. Se exige además reserva viva, por el mismo motivo.
    const now = new Date();
    const claim = await prisma.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: "PENDING",
        status: { notIn: [...NON_PAYABLE_ORDER_STATUS] },
        OR: [
          { reservationExpiresAt: null },
          { reservationExpiresAt: { gt: now } },
        ],
      },
      data: { paymentStatus: "VERIFYING" },
    });

    if (claim.count === 0) {
      // Distinguir "ya en curso" de "pedido no pagable" para no decirle al
      // cliente que reintente algo que nunca va a poder pagarse.
      const current = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true, paymentStatus: true, reservationExpiresAt: true },
      });

      const blocked = current ? canStartPayment(current, now) : null;
      return {
        success: false,
        error:
          blocked && !blocked.canStart
            ? blocked.message
            : "Esta orden ya fue procesada o tiene un pago en curso.",
      };
    }

    // 3. Crear cargo en Culqi
    const totalInCents = solesToCents(Number(order.total));

    const chargeResult = await createCulqiCharge({
      amount: totalInCents,
      currency_code: "PEN",
      email: data.email,
      source_id: data.culqiToken,
      description: `Orden #${order.orderNumber}`,
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
      },
    });

    // 4. Si el cargo falló, soltar el claim para que el cliente pueda
    // reintentar con otra tarjeta. Sin esto la orden quedaría atascada en
    // VERIFYING y ningún intento posterior podría reclamarla.
    //
    // EXCEPCIÓN: si el resultado es indeterminado (la petición murió por red)
    // no liberamos. El cargo pudo haberse creado en Culqi sin que llegáramos a
    // enterarnos, y permitir el reintento cobraría dos veces. La orden queda
    // en VERIFYING para que un admin la concilie contra el panel de Culqi;
    // si el cargo existía, el webhook la marcará PAID por su cuenta.
    if (!chargeResult.success || !chargeResult.data) {
      console.error("❌ Culqi charge failed:", chargeResult.error);

      if (chargeResult.indeterminate) {
        console.error(
          `⚠️ Orden ${order.orderNumber} queda en VERIFYING: resultado de Culqi indeterminado, requiere conciliación manual.`,
        );
        return {
          success: false,
          error:
            "No pudimos confirmar el estado de tu pago. No vuelvas a intentarlo: revisaremos tu orden y te confirmaremos en breve.",
        };
      }

      await prisma.order.updateMany({
        where: { id: order.id, paymentStatus: "VERIFYING" },
        data: { paymentStatus: "PENDING" },
      });

      return {
        success: false,
        error: chargeResult.error || "Error al procesar el pago",
      };
    }

    const charge = chargeResult.data;
    console.log("✅ Culqi charge successful:", charge.id);

    // 5. Marcar la orden pagada — con claim condicionado, NO con un `update`
    // incondicional.
    //
    // El claim del paso 2 evita el doble cobro, pero no protege este momento:
    // entre él y este punto transcurrió toda la llamada a Culqi, y en esa
    // ventana un admin pudo CANCELAR la orden (lo que ya devolvió el stock al
    // inventario). Un `update` directo la dejaba PAGADA sin unidades detrás y
    // el pedido salía a despacho sin respaldo.
    const cardInfo = formatCardInfo(charge);

    const claimPaid = await claimOrderAsPaid(order.id, {
      status: "PAID",
      paymentStatus: "PAID",
      paymentId: charge.id,
      paymentProvider: "culqi",
      paymentDetails: {
        chargeId: charge.id,
        authorizationCode: charge.authorization_code,
        referenceCode: charge.reference_code,
        cardBrand: cardInfo.brand,
        cardLastFour: cardInfo.lastFour,
        cardType: cardInfo.type,
        amount: charge.amount,
        currency: charge.currency_code,
        createdAt: new Date(charge.creation_date * 1000).toISOString(),
      } satisfies Prisma.InputJsonValue,
      paidAt: new Date(),
    });

    // Cobramos dinero sobre una orden que ya no admite pago. No podemos
    // "deshacer" el cargo aquí (no hay integración de refund con Culqi), así
    // que lo dejamos anotado para conciliación manual y se lo decimos al
    // cliente en vez de mostrarle una confirmación falsa.
    if (claimPaid.outcome === "not-payable") {
      await recordOrphanPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: "Culqi",
        providerPaymentId: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency_code,
        status: claimPaid.status,
        paymentStatus: claimPaid.paymentStatus,
      });

      revalidatePath("/admin/ordenes");

      return {
        success: false,
        error:
          "Tu pago se procesó, pero el pedido ya no estaba disponible. No te preocupes: lo revisaremos y te devolveremos el importe.",
      };
    }

    // NOTA: El inventario YA se descontó atómicamente en createOrder (para
    // tarjeta/PayPal el stock se reserva al crear la orden). NO volver a
    // descontar aquí — hacerlo causaba doble/triple descuento (createOrder +
    // processCardPayment + webhook) y stock negativo.

    // 6a. Ya estaba pagada con OTRO cargo: acabamos de cobrar de más.
    //
    // El claim del paso 2 hace esto improbable, pero no imposible: el webhook de
    // Culqi pudo confirmar un cargo anterior (un reintento cuyo resultado
    // creíamos perdido) mientras esta petición hablaba con la pasarela. Sin este
    // registro el importe extra se quedaba en Culqi sin que nadie lo supiera.
    if (
      claimPaid.outcome === "already-paid" &&
      isDuplicateProviderPayment(claimPaid.paymentId, charge.id)
    ) {
      await recordOrphanPayment({
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: "Culqi",
        providerPaymentId: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency_code,
        status: order.status,
        paymentStatus: "PAID",
        kind: "duplicate",
        appliedPaymentId: claimPaid.paymentId,
      });

      revalidatePath("/admin/ordenes");

      return {
        success: false,
        error:
          "Tu pedido ya estaba pagado y este segundo cargo se hizo por error. Lo detectamos y te devolveremos el importe.",
      };
    }

    // 6b. Efectos (lealtad, SUNAT, correo) SOLO si este flujo ganó el claim. Si
    // el webhook ya la había marcado pagada, él corrió los mismos efectos:
    // repetirlos aquí duplicaría el comprobante y el correo al cliente.
    if (claimPaid.outcome === "claimed") {
      await runCulqiPostPaymentEffects(order.id);
    }

    // 7. Revalidar páginas
    revalidatePath("/admin/ordenes");
    revalidatePath(`/orden/${order.id}/confirmacion`);

    console.log(`✅ Order ${order.orderNumber} paid successfully with Culqi`);

    return {
      success: true,
      orderId: order.id,
      chargeId: charge.id,
    };
  } catch (error) {
    console.error("❌ Error processing card payment:", error);
    
    return {
      success: false,
      error: "Error inesperado al procesar el pago. Por favor intenta nuevamente.",
    };
  }
}