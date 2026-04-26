// Seeds a baseline "Carrito" Page wired as the active theme's cart-blocks
// wrapper (Plan 10). The blocks render ABOVE the cart UI on /carrito.
// Idempotent — skips if a page with slug "carrito-bloques" already exists,
// and only links the theme when the active theme has no cartPageId.
//
// Run after seed-themes.ts:
//   npx tsx scripts/seed-cart-page.ts
import { PrismaClient, type LandingBlockType } from "@prisma/client"
import { randomUUID } from "node:crypto"

const prisma = new PrismaClient()

// Slug not browsable as a page (the [slug] route redirects matching slugs to
// /carrito) so admins can't accidentally browse this. Picked something that
// isn't a likely human destination either.
const CART_SLUG = "carrito-bloques"

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

const CART_BLOCKS: SeedBlock[] = [
  {
    type: "TICKER",
    content: {
      data: {
        text: "🚚 Envío gratis en pedidos mayores a S/ 150 · Llega a tu casa en 24-48 hs",
        speed: "medium",
        sticky: false,
      },
      style: { ...DEFAULT_STYLE, paddingY: "sm" },
      media: {},
    },
  },
  {
    type: "TRUST_BADGES",
    content: {
      data: {
        badges: [
          {
            id: randomUUID(),
            icon: "ShieldCheck",
            title: "Pago seguro",
            subtitle: "SSL + tarjeta cifrada",
          },
          {
            id: randomUUID(),
            icon: "Truck",
            title: "Envío rápido",
            subtitle: "24-48 hs en Lima",
          },
          {
            id: randomUUID(),
            icon: "RefreshCw",
            title: "Devoluciones",
            subtitle: "30 días",
          },
        ],
        layout: "horizontal",
        columns: 3,
        iconSize: "md",
        iconStyle: "outline",
      },
      style: { ...DEFAULT_STYLE, paddingY: "sm" },
      media: {},
    },
  },
]

async function main() {
  console.log("Sembrando página de bloques del carrito...")

  let cartPage = await prisma.page.findUnique({
    where: { slug: CART_SLUG },
    select: { id: true, _count: { select: { pageBlocks: true } } },
  })

  if (!cartPage) {
    const created = await prisma.page.create({
      data: {
        slug: CART_SLUG,
        title: "Bloques del carrito",
        description:
          "Bloques que se renderizan arriba del UI del carrito (banner de envío, trust badges, etc.).",
        active: true,
      },
      select: { id: true, _count: { select: { pageBlocks: true } } },
    })
    cartPage = created
    console.log(`  ✓ Página "${CART_SLUG}" creada.`)
  } else {
    console.log(`  · Página "${CART_SLUG}" ya existe. Skipped.`)
  }

  if (cartPage._count.pageBlocks === 0) {
    for (let i = 0; i < CART_BLOCKS.length; i++) {
      const b = CART_BLOCKS[i]
      await prisma.pageBlock.create({
        data: {
          pageId: cartPage.id,
          type: b.type,
          position: i,
          content: b.content as object,
        },
      })
    }
    console.log(`  ✓ ${CART_BLOCKS.length} bloques iniciales sembrados.`)
  } else {
    console.log(
      `  · La página ya tiene ${cartPage._count.pageBlocks} bloques. Skipped.`,
    )
  }

  const activeTheme = await prisma.theme.findFirst({
    where: { active: true },
    select: { id: true, name: true, cartPageId: true },
  })

  if (!activeTheme) {
    console.log("  ⚠️  No hay tema activo. Corré scripts/seed-themes.ts antes.")
    return
  }

  if (activeTheme.cartPageId) {
    console.log(
      `  · Tema "${activeTheme.name}" ya tiene una página de carrito asignada. Skipped.`,
    )
    return
  }

  await prisma.theme.update({
    where: { id: activeTheme.id },
    data: { cartPageId: cartPage.id },
  })
  console.log(
    `  ✓ Página "${CART_SLUG}" asignada como cart del tema "${activeTheme.name}".`,
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
