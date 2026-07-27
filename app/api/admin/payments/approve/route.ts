import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { approvePaymentSchema } from "@/lib/validations";
import { getRequestLogger } from "@/lib/logger";
import { approvePendingPayment } from "@/lib/payments/verify-pending-payment";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("payments:verify");
  if (authResponse) return authResponse;

  const log = (await getRequestLogger()).child({ route: "payments/approve" });

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const { paymentId } = approvePaymentSchema.parse(data);

    // Toda la lógica (claim atómico, estado de la orden, descuento de stock,
    // lealtad y auditoría) vive en lib/payments/verify-pending-payment.ts,
    // compartida con el Server Action que usa la UI del admin.
    const result = await approvePendingPayment(paymentId, {
      id: user.id,
      email: user.email,
    });

    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND" ? 404 : result.code === "STOCK_UNAVAILABLE" ? 409 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ success: true, alreadyProcessed: result.alreadyProcessed ?? false });
  } catch (error) {
    log.error({ err: error }, "Failed to approve payment");

    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}
