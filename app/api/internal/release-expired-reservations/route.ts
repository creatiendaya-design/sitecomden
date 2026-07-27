import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  releaseExpiredReservations,
  DEFAULT_BATCH_LIMIT,
} from "@/lib/inventory/release-expired-reservations";

/**
 * Job de liberación de reservas de inventario vencidas.
 *
 * Agnóstico del planificador, igual que /api/internal/review-requests: pégale un
 * GET periódico desde cualquier cron externo con
 * `Authorization: Bearer <CRON_SECRET>`. En este repo lo hace
 * .github/workflows/release-expired-reservations.yml.
 *
 * Cada orden de pasarela sin pagar cuya `reservationExpiresAt` quedó atrás se
 * cancela y devuelve su stock. Ver lib/inventory/release-expired-reservations.ts
 * para el porqué de cancelar en vez de sólo liberar.
 */
export const dynamic = "force-dynamic";

const log = logger.child({ module: "release-expired-reservations-route" });

export async function GET(request: Request) {
  // Fail-closed en producción: este endpoint CANCELA pedidos, así que una
  // variable ausente no puede significar "abierto". (Mismo criterio que
  // /api/internal/review-requests, que envía correos a clientes reales.)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const batchLimit = parseBatchLimit(request);

  try {
    const result = await releaseExpiredReservations({ batchLimit });

    // Sólo se registra cuando hubo trabajo: la pasada normal no encuentra nada
    // y no tiene por qué llenar el log.
    if (result.scanned > 0) {
      log.info(result, "Expired reservation sweep finished");
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error({ err: error }, "Expired reservation sweep failed");
    return NextResponse.json(
      { ok: false, error: "Error al liberar reservas vencidas" },
      { status: 500 }
    );
  }
}

/** `?limit=` para drenar un atasco a mano sin tocar el código. */
function parseBatchLimit(request: Request): number {
  const raw = new URL(request.url).searchParams.get("limit");
  if (!raw) return DEFAULT_BATCH_LIMIT;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BATCH_LIMIT;

  return Math.min(parsed, 1000);
}
