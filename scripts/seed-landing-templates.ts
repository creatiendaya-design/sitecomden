// Seed three example landing templates: Electrónica genérica, Moda y ropa,
// Producto simple. Idempotent — skips templates whose name already exists.
//
// Run once after first deploy or anytime you want the example library back:
//   npx tsx scripts/seed-landing-templates.ts
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"

const prisma = new PrismaClient()

interface SeedBlock {
  type:
    | "HERO" | "GALLERY" | "TESTIMONIALS" | "VIDEO" | "TICKER"
    | "TRUST_BADGES" | "RICH_TEXT" | "FAQ" | "IMAGE_TEXT" | "RELATED_PRODUCTS"
  content: Record<string, unknown>
}

interface SeedTemplate {
  name: string
  description: string
  category: "electronica" | "moda" | "general"
  blocks: SeedBlock[]
}

const DEFAULT_STYLE = {
  paddingY: "md",
  alignment: "center",
  containerWidth: "normal",
  cornerRadius: "none",
  border: "none",
  shadow: "none",
  visibility: "always",
}

function hero(title: string, subtitle: string, ctaText = "Comprar ahora"): SeedBlock {
  return {
    type: "HERO",
    content: {
      data: { title, subtitle, ctaText },
      style: { ...DEFAULT_STYLE, paddingY: "xl" },
      media: {
        bgImage: { desktop: "", mobile: "" },
        bgOverlay: { desktop: "rgba(0,0,0,0.3)", mobile: "rgba(0,0,0,0.3)" },
      },
    },
  }
}

function gallery(): SeedBlock {
  return {
    type: "GALLERY",
    content: {
      data: { displayType: "slider", images: [], showBuyButton: false },
      style: { ...DEFAULT_STYLE },
      media: {},
    },
  }
}

function testimonials(items: { name: string; text: string; rating: 1 | 2 | 3 | 4 | 5 }[]): SeedBlock {
  return {
    type: "TESTIMONIALS",
    content: {
      data: { items: items.map((t) => ({ id: randomUUID(), ...t })) },
      style: { ...DEFAULT_STYLE },
      media: {},
    },
  }
}

function trustBadges(): SeedBlock {
  return {
    type: "TRUST_BADGES",
    content: {
      data: {
        badges: [
          { id: randomUUID(), icon: "ShieldCheck", title: "Pago seguro", subtitle: "SSL y tarjeta cifrada" },
          { id: randomUUID(), icon: "Truck", title: "Envío gratis", subtitle: "En compras mayores a S/150" },
          { id: randomUUID(), icon: "RefreshCw", title: "Devoluciones", subtitle: "30 días" },
          { id: randomUUID(), icon: "BadgeCheck", title: "Garantía", subtitle: "Productos originales" },
        ],
        layout: "horizontal",
        columns: 4,
        iconSize: "md",
        iconStyle: "outline",
      },
      style: { ...DEFAULT_STYLE },
      media: {},
    },
  }
}

function faq(items: { question: string; answer: string }[]): SeedBlock {
  return {
    type: "FAQ",
    content: {
      data: {
        title: "Preguntas frecuentes",
        items: items.map((i) => ({ id: randomUUID(), ...i })),
        allowMultipleOpen: false,
        defaultOpenFirst: false,
      },
      style: { ...DEFAULT_STYLE, alignment: "left" },
      media: {},
    },
  }
}

function imageText(title: string, description: string, position: "left" | "right" = "left"): SeedBlock {
  return {
    type: "IMAGE_TEXT",
    content: {
      data: {
        title,
        description,
        imagePosition: position,
        imageAlt: title,
        ctaText: "",
        ctaUrl: "",
        ratioImageToText: "50-50",
      },
      style: { ...DEFAULT_STYLE, alignment: "left" },
      media: { image: { desktop: "", mobile: "" } },
    },
  }
}

function richText(html: string): SeedBlock {
  return {
    type: "RICH_TEXT",
    content: {
      data: { html, maxWidth: "prose" },
      style: { ...DEFAULT_STYLE, alignment: "left" },
      media: {},
    },
  }
}

const TEMPLATES: SeedTemplate[] = [
  {
    name: "Electrónica genérica",
    description: "Plantilla para productos electrónicos: hero, galería, badges y FAQ.",
    category: "electronica",
    blocks: [
      hero("Tecnología que mejora tu día", "Descubre por qué este producto es la opción favorita de miles de clientes."),
      gallery(),
      trustBadges(),
      faq([
        { question: "¿Cuánto demora el envío?", answer: "<p>Entre 24 y 72 horas en Lima Metropolitana.</p>" },
        { question: "¿Tiene garantía?", answer: "<p>Sí, 12 meses contra defectos de fábrica.</p>" },
        { question: "¿Puedo devolver el producto?", answer: "<p>Tienes 30 días calendario para devoluciones.</p>" },
      ]),
    ],
  },
  {
    name: "Moda y ropa",
    description: "Plantilla para prendas y accesorios: hero, galería, descripción detallada y testimonios.",
    category: "moda",
    blocks: [
      hero("Estilo que define tu día", "Diseño contemporáneo, comodidad para todo el día."),
      gallery(),
      imageText(
        "Hecho para durar",
        "<p>Cada pieza pasa por controles de calidad rigurosos antes de llegar a tus manos. Telas seleccionadas, costuras reforzadas y un diseño pensado para acompañarte en cada ocasión.</p>",
        "left",
      ),
      testimonials([
        { name: "María", text: "Me encantó la calidad de la tela y el calce. Repetiré.", rating: 5 },
        { name: "Lucía", text: "Excelente servicio y el producto llegó antes de lo esperado.", rating: 5 },
      ]),
      trustBadges(),
    ],
  },
  {
    name: "Producto simple",
    description: "Plantilla minimalista: hero, descripción libre, galería y badges.",
    category: "general",
    blocks: [
      hero("Conocé este producto", "Una propuesta simple, sin vueltas."),
      richText("<h2>Por qué elegirlo</h2><p>Texto descriptivo del producto. Editá esto en el bloque RichText con encabezados, listas y enlaces según necesites.</p><ul><li>Punto destacado uno</li><li>Punto destacado dos</li><li>Punto destacado tres</li></ul>"),
      gallery(),
      trustBadges(),
    ],
  },
]

async function main() {
  console.log("Sembrando plantillas de ejemplo...")
  for (const t of TEMPLATES) {
    const existing = await prisma.landingTemplate.findFirst({ where: { name: t.name } })
    if (existing) {
      console.log(`  · "${t.name}" ya existe — saltado`)
      continue
    }
    const created = await prisma.landingTemplate.create({
      data: {
        name: t.name,
        description: t.description,
        category: t.category,
        active: true,
      },
    })
    await prisma.templateBlock.createMany({
      data: t.blocks.map((b, i) => ({
        templateId: created.id,
        type: b.type,
        position: i,
        content: b.content as object,
      })),
    })
    console.log(`  ✓ "${t.name}" creada con ${t.blocks.length} bloques`)
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
