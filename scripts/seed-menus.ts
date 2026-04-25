// Seeds initial main + footer menus so the storefront has a baseline
// navigation out of the box. Idempotent — skips if any menu already exists,
// so admins who already configured menus aren't overwritten.
//
// Run once after first deploy:
//   npx tsx scripts/seed-menus.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface SeedItem {
  label: string
  linkType: string
  externalUrl?: string | null
  targetId?: string | null
  openInNewTab?: boolean
  children?: SeedItem[]
}

interface SeedMenu {
  slug: string
  title: string
  description: string
  items: SeedItem[]
}

const MENUS: SeedMenu[] = [
  {
    slug: "main",
    title: "Menú principal",
    description: "Navegación principal del header de la tienda.",
    items: [
      { label: "Inicio", linkType: "HOME" },
      { label: "Productos", linkType: "PRODUCTS_INDEX" },
      { label: "Categorías", linkType: "COLLECTIONS_INDEX" },
      { label: "Nosotros", linkType: "EXTERNAL_URL", externalUrl: "/nosotros" },
      { label: "Contacto", linkType: "EXTERNAL_URL", externalUrl: "/contacto" },
    ],
  },
  {
    slug: "footer",
    title: "Menú de pie",
    description: "Navegación del footer agrupada en columnas.",
    items: [
      {
        // Pure parent — HOME is used as a no-op linkType because the schema
        // requires a value but parents typically just group children.
        label: "Información",
        linkType: "HOME",
        children: [
          { label: "Términos", linkType: "EXTERNAL_URL", externalUrl: "/terminos" },
          { label: "Privacidad", linkType: "EXTERNAL_URL", externalUrl: "/privacidad" },
          { label: "Devoluciones", linkType: "EXTERNAL_URL", externalUrl: "/devoluciones" },
        ],
      },
      {
        label: "Ayuda",
        linkType: "HOME",
        children: [
          { label: "FAQ", linkType: "EXTERNAL_URL", externalUrl: "/preguntas" },
          { label: "Envíos", linkType: "EXTERNAL_URL", externalUrl: "/envios" },
        ],
      },
    ],
  },
]

async function main() {
  console.log("Sembrando menús iniciales...")

  const existingCount = await prisma.menu.count()
  if (existingCount > 0) {
    console.log(`  · Ya existen ${existingCount} menú(s). Skipped.`)
    return
  }

  for (const m of MENUS) {
    const created = await prisma.menu.create({
      data: {
        slug: m.slug,
        title: m.title,
        description: m.description,
        active: true,
      },
    })

    let rootPosition = 0
    for (const root of m.items) {
      const rootRow = await prisma.menuItem.create({
        data: {
          menuId: created.id,
          parentId: null,
          position: rootPosition,
          label: root.label,
          linkType: root.linkType,
          targetId: root.targetId ?? null,
          externalUrl: root.externalUrl ?? null,
          openInNewTab: root.openInNewTab ?? false,
        },
      })
      rootPosition += 1

      if (root.children && root.children.length > 0) {
        let childPosition = 0
        for (const child of root.children) {
          await prisma.menuItem.create({
            data: {
              menuId: created.id,
              parentId: rootRow.id,
              position: childPosition,
              label: child.label,
              linkType: child.linkType,
              targetId: child.targetId ?? null,
              externalUrl: child.externalUrl ?? null,
              openInNewTab: child.openInNewTab ?? false,
            },
          })
          childPosition += 1
        }
      }
    }

    const totalItems = await prisma.menuItem.count({
      where: { menuId: created.id },
    })
    console.log(`  ✓ Menú "${m.title}" (${m.slug}) creado con ${totalItems} item(s).`)
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
