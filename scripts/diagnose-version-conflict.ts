/**
 * Diagnostic for Plan 18: confirms the optimistic-locking helper actually
 * detects a conflict against the real DB. Bypasses the auth/Server Action
 * layer to isolate whether the issue is in the DB-level check or in the UI
 * wiring.
 *
 * Usage: npx tsx scripts/diagnose-version-conflict.ts
 */
import { prisma } from "../lib/db";
import { updateWithVersionAndRefetch } from "../lib/concurrency/with-version";

async function main() {
  // Pick the active theme as the test subject.
  const theme = await prisma.theme.findFirst({ where: { active: true } });
  if (!theme) {
    console.error("No active theme found.");
    process.exit(1);
  }

  console.log(`\n=== Theme: ${theme.name} (id=${theme.id}) ===`);
  console.log(`Current DB version: ${theme.version}`);

  // Both clients capture the SAME initial version (simulating two admins
  // who opened the customizer at the same time).
  const expectedVersion = theme.version;
  console.log(`\nBoth simulated clients see expectedVersion=${expectedVersion}`);

  // --- Client A: bumps the theme description ---
  const resultA = await updateWithVersionAndRefetch<
    { version: number },
    { id: string; version: number }
  >({
    model: prisma.theme,
    id: theme.id,
    expectedVersion,
    data: { description: `diagnostic A — ${Date.now()}` },
    refetch: (id) =>
      prisma.theme.findUnique({ where: { id }, select: { id: true, version: true } }),
  });
  console.log(`\nClient A save:`, JSON.stringify(resultA, null, 2));

  // --- Client B: also uses the original expectedVersion ---
  const resultB = await updateWithVersionAndRefetch<
    { version: number },
    { id: string; version: number }
  >({
    model: prisma.theme,
    id: theme.id,
    expectedVersion,
    data: { description: `diagnostic B — ${Date.now()}` },
    refetch: (id) =>
      prisma.theme.findUnique({ where: { id }, select: { id: true, version: true } }),
  });
  console.log(`\nClient B save:`, JSON.stringify(resultB, null, 2));

  // --- Verdict ---
  console.log("\n=== Verdict ===");
  if (resultA.ok && !resultB.ok && resultB.reason === "conflict") {
    console.log("✅ Conflict detection works at the DB layer.");
    console.log("   → If <ConflictDialog> isn't showing, the bug is in the UI wiring.");
  } else if (resultA.ok && resultB.ok) {
    console.log("❌ Both saves succeeded. The DB-level conflict check is NOT working.");
    console.log("   Likely cause: updateMany predicate or version increment broken.");
  } else {
    console.log("⚠️  Unexpected result combination. Inspect the outputs above.");
  }

  // Restore the theme description to something neutral so the diagnostic
  // doesn't leave noise behind.
  await prisma.theme.update({
    where: { id: theme.id },
    data: { description: theme.description },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
