import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Plan 14 — Neon warmup endpoint.
 *
 * Hit by Vercel Cron every 4 minutes (configured in vercel.json) to keep
 * the Neon serverless branch from suspending after ~5 min of inactivity.
 * Cold starts on free-tier branches caused the customizer P1001 errors
 * we saw earlier; keeping the connection warm sidesteps the issue
 * without paying for an always-on Neon plan.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the
 * env var is configured. Without the secret the endpoint is open — useful
 * for local testing but not exposed in production unless CRON_SECRET is
 * unset (which would be a misconfiguration). Vercel's docs recommend
 * setting CRON_SECRET, so we treat it as the production guard.
 */
export const dynamic = "force-dynamic"

// Cap response time so a wedged DB doesn't stall the cron worker. Cron
// jobs that take >10s are killed by Vercel anyway; 8s is a safer cap.
const PING_TIMEOUT_MS = 8000

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const start = Date.now()
  try {
    const result = await Promise.race([
      // Cheap query: just confirms the connection works. Selecting a
      // single id avoids transferring any meaningful data over the wire.
      prisma.theme.findFirst({ select: { id: true } }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("warmup timeout")),
          PING_TIMEOUT_MS,
        ),
      ),
    ])
    return NextResponse.json({
      ok: true,
      ms: Date.now() - start,
      // Helpful for triage: shows whether the branch was warm (sub-100ms)
      // or just got woken up (typically 1-3 seconds).
      hadActiveTheme: Boolean(result),
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        ms: Date.now() - start,
      },
      { status: 500 },
    )
  }
}
