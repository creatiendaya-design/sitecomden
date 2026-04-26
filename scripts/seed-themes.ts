// Seeds a baseline "Tema base" theme so admins always have an active theme
// to edit (Shopify-style — there's never a "no themes yet" state).
// Idempotent — re-running skips themes whose name already exists.
//
// Run once after first deploy:
//   npx tsx scripts/seed-themes.ts
//
// Pre-requisite: the landing template seeds should already exist
// (see scripts/seed-landing-templates.ts). The seed picks "Producto simple"
// as the default product landing because it's the most generic of the three.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface SeedTheme {
  name: string
  description: string
  /** Pick a landing template by name to use as defaultProductLandingTemplate.
   *  If the named template doesn't exist, the theme is still created without
   *  a default — the admin can pick one from the editor. */
  defaultProductLandingTemplateName?: string
  /** Visual design tokens (Plan 11). Optional — empty {} means "use system
   *  defaults", which match the existing look. Override fields here when a
   *  theme should ship with a distinctive identity out of the box. */
  tokens?: object
}

const THEMES: SeedTheme[] = [
  {
    name: "Tema base",
    description:
      "Tema inicial de la tienda. Editalo para personalizar el diseño global.",
    defaultProductLandingTemplateName: "Producto simple",
    // Empty tokens — falls back to the conservative defaults defined in
    // lib/themes/tokens.ts so adopting Plan 11 doesn't change the look.
    tokens: {},
  },
]

async function main() {
  console.log("Sembrando temas iniciales...")

  // If ANY theme already exists, skip — assume the admin has already set up.
  const existingCount = await prisma.theme.count()
  if (existingCount > 0) {
    console.log(`  · Ya existen ${existingCount} tema(s). Skipped.`)
    return
  }

  for (let i = 0; i < THEMES.length; i++) {
    const t = THEMES[i]
    let defaultProductLandingTemplateId: string | null = null
    if (t.defaultProductLandingTemplateName) {
      const tpl = await prisma.landingTemplate.findFirst({
        where: { name: t.defaultProductLandingTemplateName, active: true },
        select: { id: true },
      })
      defaultProductLandingTemplateId = tpl?.id ?? null
      if (!tpl) {
        console.log(
          `  · ⚠️  Plantilla "${t.defaultProductLandingTemplateName}" no encontrada. ` +
            `El tema "${t.name}" se creará sin default de producto.`,
        )
      }
    }

    await prisma.theme.create({
      data: {
        name: t.name,
        description: t.description,
        // The first seeded theme becomes active automatically.
        active: i === 0,
        defaultProductLandingTemplateId,
        tokens: (t.tokens ?? {}) as object,
      },
    })
    console.log(
      `  ✓ Tema "${t.name}" creado${i === 0 ? " (activo)" : ""}` +
        (defaultProductLandingTemplateId
          ? ` con plantilla default "${t.defaultProductLandingTemplateName}"`
          : ""),
    )
  }
  console.log("Listo.")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
