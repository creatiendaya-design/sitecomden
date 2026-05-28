#!/usr/bin/env node
/**
 * Vercel build orchestrator.
 *
 * Why: Neon serverless can be in cold-start when Vercel kicks the build,
 * which trips up `prisma migrate deploy`'s 10s advisory-lock timeout (P1002).
 * This script:
 *   1. Pings Neon with a trivial query so the cold-start happens during
 *      warmup, not during the lock acquisition.
 *   2. Retries `prisma migrate deploy` up to 3 times with backoff so a
 *      transient P1002 doesn't fail the whole build.
 *   3. Runs `next build` only once everything migrated successfully.
 *
 * Vercel auto-detects `vercel-build` in package.json scripts and uses it
 * instead of the default build command. No Vercel UI changes needed.
 */

import { execSync } from "node:child_process"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function warmupNeon() {
  console.log("→ Warming up Neon…")
  try {
    const { PrismaClient } = await import("@prisma/client")
    const prisma = new PrismaClient()
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log("✓ Neon responding")
    } finally {
      await prisma.$disconnect()
    }
  } catch (err) {
    console.warn(
      "⚠ Neon warmup failed (continuing anyway):",
      err instanceof Error ? err.message : err,
    )
  }
}

async function migrateWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`→ prisma migrate deploy (attempt ${attempt}/${maxAttempts})`)
      execSync("npx prisma migrate deploy", { stdio: "inherit" })
      console.log("✓ Migrations applied")
      return
    } catch (err) {
      if (attempt === maxAttempts) throw err
      const backoff = attempt * 5000
      console.warn(
        `⚠ migrate deploy failed (attempt ${attempt}); retrying in ${backoff / 1000}s…`,
      )
      await sleep(backoff)
    }
  }
}

async function main() {
  await warmupNeon()
  await migrateWithRetry()
  console.log("→ next build")
  execSync("npx next build", { stdio: "inherit" })
}

main().catch((err) => {
  console.error("✗ Vercel build failed:", err)
  process.exit(1)
})
