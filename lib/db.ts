import { PrismaClient } from '@prisma/client'

/**
 * Neon free/serverless branches suspend after ~5 min of inactivity. The
 * first query against a cold branch sometimes fails with P1001
 * ("Can't reach database server") before the branch finishes waking up.
 *
 * - `connect_timeout=15` (seconds) gives the engine enough headroom to
 *   wait for the Neon compute to wake up (typically 500ms-3s) instead of
 *   failing fast on the default 5s timeout.
 * - `pool_timeout=15` lets pgBouncer wait in line for a backend
 *   connection instead of surfacing a transient error to the user.
 * - `pgbouncer=true` is required when connecting through the Neon pooler
 *   host (`*-pooler*`). It tells Prisma the upstream is PgBouncer in
 *   transaction mode and disables prepared-statement caching, which
 *   eliminates the noisy "Error in PostgreSQL connection: Closed" logs
 *   that appear when PgBouncer recycles idle backend sockets.
 *
 * The URL is patched at runtime so we don't have to touch the .env on
 * every environment — the database connection string itself stays clean.
 */
const CONNECT_TIMEOUT_SECONDS = 15
const POOL_TIMEOUT_SECONDS = 15

function ensureNeonTimeouts(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl
  try {
    const url = new URL(rawUrl)
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", String(CONNECT_TIMEOUT_SECONDS))
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", String(POOL_TIMEOUT_SECONDS))
    }
    // Neon's pooled host always contains "-pooler" in the subdomain.
    // When using it we must signal PgBouncer mode so Prisma stops
    // pinning prepared statements to recycled backends.
    if (url.hostname.includes("-pooler") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true")
    }
    return url.toString()
  } catch {
    return rawUrl
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: ensureNeonTimeouts(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
