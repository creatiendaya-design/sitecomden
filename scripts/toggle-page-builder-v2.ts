/**
 * Toggle the LANDING_BUILDER_V2 feature flag.
 *
 * Usage:
 *   npx tsx scripts/toggle-page-builder-v2.ts on     # enable
 *   npx tsx scripts/toggle-page-builder-v2.ts off    # disable
 *   npx tsx scripts/toggle-page-builder-v2.ts        # show current state
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]?.toLowerCase()

  if (!arg) {
    const existing = await prisma.setting.findUnique({
      where: { key: "LANDING_BUILDER_V2" },
    })
    if (!existing) {
      console.log("⚠ LANDING_BUILDER_V2 setting does not exist yet (flag effectively OFF).")
    } else {
      console.log(`Current LANDING_BUILDER_V2 = ${JSON.stringify(existing.value)}`)
    }
    return
  }

  if (arg !== "on" && arg !== "off") {
    console.error('Expected argument "on" or "off" (or no arg to read current state).')
    process.exit(1)
  }

  const value = arg === "on"

  await prisma.setting.upsert({
    where: { key: "LANDING_BUILDER_V2" },
    update: { value, category: "features" },
    create: {
      key: "LANDING_BUILDER_V2",
      value,
      category: "features",
      description: "Enable the new visual page builder for product landings.",
    },
  })

  console.log(`✅ LANDING_BUILDER_V2 set to ${value}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
