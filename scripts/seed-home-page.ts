// Seeds a baseline "Inicio" Page wired as the active theme's home (Plan 6).
// Idempotent — skips if a page with slug "inicio" already exists, and only
// links the theme when the active theme has no home assigned.
//
// Run after seed-themes.ts:
//   npx tsx scripts/seed-home-page.ts
import { PrismaClient } from "@prisma/client"
import type { LandingBlockType } from "../lib/types/landing-blocks"
import { randomUUID } from "node:crypto"

const prisma = new PrismaClient()

const HOME_SLUG = "inicio"

const DEFAULT_STYLE = {
  paddingY: "md",
  alignment: "center",
  containerWidth: "normal",
  cornerRadius: "none",
  border: "none",
  shadow: "none",
  visibility: "always",
}

interface SeedBlock {
  type: LandingBlockType
  content: Record<string, unknown>
}

const HOME_BLOCKS: SeedBlock[] = [
  {
    type: "HERO",
    content: {
      data: {
        title: "Bienvenido a la tienda",
        subtitle:
          "Esta es la home de tu tienda. Editala desde Personalizar → Home para reemplazar este contenido por el tuyo.",
        ctaText: "Ver productos",
      },
      style: { ...DEFAULT_STYLE, paddingY: "xl" },
      media: {
        bgImage: { desktop: "", mobile: "" },
        bgOverlay: { desktop: "rgba(0,0,0,0.3)", mobile: "rgba(0,0,0,0.3)" },
      },
    },
  },
  {
    type: "TRUST_BADGES",
    content: {
      data: {
        badges: [
          {
            id: randomUUID(),
            icon: "Truck",
            title: "Envío rápido",
            subtitle: "A todo el Perú",
          },
          {
            id: randomUUID(),
            icon: "ShieldCheck",
            title: "Pago seguro",
            subtitle: "Tarjeta, Yape y Plin",
          },
          {
            id: randomUUID(),
            icon: "RefreshCw",
            title: "Devoluciones",
            subtitle: "Hasta 30 días",
          },
          {
            id: randomUUID(),
            icon: "Headphones",
            title: "Soporte 24/7",
            subtitle: "Estamos aquí para ayudarte",
          },
        ],
        layout: "horizontal",
        columns: 4,
        iconSize: "md",
        iconStyle: "outline",
      },
      style: { ...DEFAULT_STYLE },
      media: {},
    },
  },
  {
    type: "GALLERY",
    content: {
      data: { displayType: "grid", images: [], showBuyButton: false },
      style: { ...DEFAULT_STYLE },
      media: {},
    },
  },
  {
    type: "RICH_TEXT",
    content: {
      data: {
        html: "<h2>Sobre nosotros</h2><p>Reemplazá este texto desde el editor para contar tu historia.</p>",
        maxWidth: "prose",
      },
      style: { ...DEFAULT_STYLE, alignment: "left" },
      media: {},
    },
  },
]

async function main() {
  console.log("Sembrando página de inicio...")

  // 1. Find or create the "Inicio" page.
  let homePage = await prisma.page.findUnique({
    where: { slug: HOME_SLUG },
    select: { id: true, _count: { select: { pageBlocks: true } } },
  })

  if (!homePage) {
    const created = await prisma.page.create({
      data: {
        slug: HOME_SLUG,
        title: "Inicio",
        description:
          "Página principal de la tienda. Editala desde el page builder.",
        active: true,
      },
      select: { id: true, _count: { select: { pageBlocks: true } } },
    })
    homePage = created
    console.log(`  ✓ Página "${HOME_SLUG}" creada.`)
  } else {
    console.log(`  · Página "${HOME_SLUG}" ya existe. Skipped.`)
  }

  // 2. If the page has no blocks yet, seed the placeholder set.
  if (homePage._count.pageBlocks === 0) {
    for (let i = 0; i < HOME_BLOCKS.length; i++) {
      const b = HOME_BLOCKS[i]
      await prisma.pageBlock.create({
        data: {
          pageId: homePage.id,
          type: b.type,
          position: i,
          content: b.content as object,
        },
      })
    }
    console.log(`  ✓ ${HOME_BLOCKS.length} bloques iniciales sembrados.`)
  } else {
    console.log(
      `  · La página ya tiene ${homePage._count.pageBlocks} bloques. Skipped.`,
    )
  }

  // 3. Wire the active theme's homePage if it has none.
  const activeTheme = await prisma.theme.findFirst({
    where: { active: true },
    select: { id: true, name: true, homePageId: true },
  })

  if (!activeTheme) {
    console.log(
      "  ⚠️  No hay tema activo. Corré scripts/seed-themes.ts antes.",
    )
    return
  }

  if (activeTheme.homePageId) {
    console.log(
      `  · Tema "${activeTheme.name}" ya tiene una home asignada. Skipped.`,
    )
    return
  }

  await prisma.theme.update({
    where: { id: activeTheme.id },
    data: { homePageId: homePage.id },
  })
  console.log(
    `  ✓ Página "${HOME_SLUG}" asignada como home del tema "${activeTheme.name}".`,
  )
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
