// Audit script: check distribution of legacy Product.template enum values
// and identify at-risk products (non-STANDARD template but no landingTemplateId and no LandingBlocks).
// Run: npx tsx scripts/audit-product-template.ts

import { prisma } from "@/lib/db";

async function audit() {
  console.log("=== Product.template Cleanup Audit ===\n");

  // 1. Distribution of template values
  const distribution = await prisma.product.groupBy({
    by: ["template"],
    _count: { _all: true },
  });

  console.log("Template value distribution:");
  for (const row of distribution) {
    console.log(`  ${row.template}: ${row._count._all} product(s)`);
  }
  console.log();

  // 2. At-risk products: non-STANDARD template but no landingTemplateId AND zero LandingBlocks
  const nonStandard = await prisma.product.findMany({
    where: {
      template: { not: "STANDARD" },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      template: true,
      landingTemplateId: true,
      _count: { select: { landingBlocks: true } },
    },
  });

  const atRisk = nonStandard.filter(
    (p) => p.landingTemplateId === null && p._count.landingBlocks === 0
  );

  console.log(
    `Non-STANDARD products with no landingTemplateId AND no LandingBlocks (AT RISK): ${atRisk.length}`
  );

  if (atRisk.length > 0) {
    console.log("\nAt-risk product details:");
    for (const p of atRisk) {
      console.log(`  id=${p.id}  slug=${p.slug}  name=${p.name}  template=${p.template}`);
    }
  }

  console.log("\nNon-STANDARD products WITH landingTemplateId or LandingBlocks (safe):");
  const safe = nonStandard.filter(
    (p) => p.landingTemplateId !== null || p._count.landingBlocks > 0
  );
  console.log(`  ${safe.length} product(s) — these already use the new system.`);

  console.log("\n=== Audit complete ===");

  if (atRisk.length > 0) {
    console.log(
      "\nDECISION: AT-RISK products found. DO NOT proceed with Phase 3 until these products are migrated."
    );
    process.exit(1);
  } else {
    console.log("\nDECISION: No at-risk products. Safe to proceed with Phase 3.");
    process.exit(0);
  }
}

audit().catch((e) => {
  console.error("Audit failed:", e);
  process.exit(2);
});
