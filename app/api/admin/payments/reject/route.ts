import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { rejectPaymentSchema } from "@/lib/validations";
import { getRequestLogger } from "@/lib/logger";
import { rejectPendingPayment } from "@/lib/payments/verify-pending-payment";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("payments:verify");
  if (authResponse) return authResponse;

  const log = (await getRequestLogger()).child({ route: "payments/reject" });

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const { paymentId, reason } = rejectPaymentSchema.parse(data);

    // Lógica compartida con el Server Action que usa la UI del admin: claim
    // atómico, cancelación de la orden, liberación del stock que realmente
    // retenga y auditoría.
    const result = await rejectPendingPayment(paymentId, reason, {
      id: user.id,
      email: user.email,
    });

    if (!result.ok) {
      const status = result.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ success: true, alreadyProcessed: result.alreadyProcessed ?? false });
  } catch (error) {
    log.error({ err: error }, "Failed to reject payment");

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
