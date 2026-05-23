import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * 🧪 Endpoint de prueba de Sentry.
 *
 * Visita /api/sentry-test?mode=throw para lanzar un error capturable.
 * Visita /api/sentry-test?mode=capture para enviar un evento manual.
 * Sin parámetro, devuelve un estado.
 *
 * ELIMINAR este archivo cuando hayas verificado que Sentry recibe eventos.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  const dsnConfigured = Boolean(
    process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  );

  if (mode === "throw") {
    throw new Error(
      "Sentry test error (server) — " + new Date().toISOString(),
    );
  }

  if (mode === "capture") {
    const eventId = Sentry.captureMessage(
      "Sentry test message (server) — " + new Date().toISOString(),
      "warning",
    );
    await Sentry.flush(2000);
    return NextResponse.json({
      ok: true,
      sent: true,
      eventId,
      dsnConfigured,
    });
  }

  return NextResponse.json({
    ok: true,
    dsnConfigured,
    usage: {
      throw: "/api/sentry-test?mode=throw",
      capture: "/api/sentry-test?mode=capture",
    },
    note: "Elimina app/api/sentry-test/route.ts cuando termines de probar.",
  });
}
