// Seeds the editorial Pages migrated from hardcoded routes (Plan 5.6):
//   - "nosotros" — about page with HERO + RICH_TEXT blocks
//   - "preguntas" — FAQ page with FAQ blocks per category
//
// Idempotent — skips slugs that already exist. The legal policies
// (terminos / privacidad / envios / devoluciones) live in the Policy table
// instead and are seeded by scripts/seed-policies.ts.
//
// Run after the main schema is in place:
//   npx tsx scripts/seed-static-pages.ts
import { PrismaClient } from "@prisma/client"
import type { LandingBlockType } from "../lib/types/landing-blocks"
import { randomUUID } from "node:crypto"

const prisma = new PrismaClient()

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

interface SeedPage {
  slug: string
  title: string
  description: string
  blocks: SeedBlock[]
}

function hero(title: string, subtitle: string): SeedBlock {
  return {
    type: "HERO",
    content: {
      data: { title, subtitle, ctaText: "" },
      style: { ...DEFAULT_STYLE, paddingY: "xl" },
      media: {
        bgImage: { desktop: "", mobile: "" },
        bgOverlay: { desktop: "rgba(0,0,0,0.3)", mobile: "rgba(0,0,0,0.3)" },
      },
    },
  }
}

function richText(html: string): SeedBlock {
  return {
    type: "RICH_TEXT",
    content: {
      data: { html: html.trim(), maxWidth: "prose" },
      style: { ...DEFAULT_STYLE, alignment: "left" },
      media: {},
    },
  }
}

function faq(
  title: string,
  items: { question: string; answer: string }[],
): SeedBlock {
  return {
    type: "FAQ",
    content: {
      data: {
        title,
        items: items.map((i) => ({ id: randomUUID(), ...i })),
        allowMultipleOpen: false,
        defaultOpenFirst: false,
      },
      style: { ...DEFAULT_STYLE, alignment: "left" },
      media: {},
    },
  }
}

const PAGES: SeedPage[] = [
  {
    slug: "nosotros",
    title: "Sobre nosotros",
    description: "Conocé nuestra historia, misión y los valores que nos guían.",
    blocks: [
      hero(
        "Sobre nosotros",
        "Conocé nuestra historia y lo que nos hace únicos",
      ),
      richText(`
<h2>Nuestra historia</h2>
<p>Nacimos con la pasión por ofrecer productos de calidad al mercado peruano. Desde nuestros inicios nos comprometimos a brindar la mejor experiencia de compra en línea, combinando tecnología moderna con un servicio al cliente excepcional.</p>
<p>Nuestra plataforma fue diseñada específicamente para las necesidades del mercado peruano, ofreciendo métodos de pago locales como Yape y Plin, además de envíos rápidos a todo el país.</p>

<h2>Nuestros valores</h2>
<ul>
  <li><strong>Calidad:</strong> seleccionamos cuidadosamente cada producto para garantizar la mejor calidad para nuestros clientes.</li>
  <li><strong>Servicio al cliente:</strong> tu satisfacción es nuestra prioridad. Estamos aquí para ayudarte en cada paso de tu compra.</li>
  <li><strong>Excelencia:</strong> buscamos constantemente mejorar nuestros procesos y servicios.</li>
  <li><strong>Comunidad:</strong> somos parte de la comunidad peruana y trabajamos para contribuir positivamente al país.</li>
</ul>

<h2>Misión</h2>
<p>Ofrecer una experiencia de compra en línea excepcional, brindando productos de calidad con envíos rápidos y métodos de pago adaptados al mercado peruano.</p>

<h2>Visión</h2>
<p>Ser la plataforma de e-commerce líder en Perú, reconocida por nuestra innovación, servicio al cliente y compromiso con la excelencia.</p>

<p style="text-align: center; margin-top: 2rem;"><a href="/contacto">¿Tenés alguna pregunta? Contactanos</a></p>
`),
    ],
  },
  {
    slug: "preguntas",
    title: "Preguntas frecuentes",
    description:
      "Encontrá respuestas a las preguntas más comunes sobre pedidos, pagos, envíos y devoluciones.",
    blocks: [
      hero(
        "Preguntas frecuentes",
        "Respuestas a las consultas más comunes sobre nuestros productos y servicios",
      ),
      faq("Pedidos", [
        {
          question: "¿Cómo realizo un pedido?",
          answer:
            "Navegá nuestro catálogo, agregá los productos al carrito y seguí el proceso de checkout. Aceptamos tarjetas, Yape, Plin y PayPal.",
        },
        {
          question: "¿Puedo modificar mi pedido después de realizarlo?",
          answer:
            "Sí, contactanos lo antes posible. Si todavía no fue procesado, hacemos lo posible por actualizarlo.",
        },
        {
          question: "¿Cómo rastreo mi pedido?",
          answer:
            "Una vez despachado, recibirás un correo con el número de seguimiento. También podés revisar el estado desde tu cuenta.",
        },
        {
          question: "¿Puedo cancelar mi pedido?",
          answer:
            "Sí, mientras no haya sido procesado y enviado. Contactanos cuanto antes para gestionar la cancelación.",
        },
      ]),
      faq("Pagos", [
        {
          question: "¿Qué métodos de pago aceptan?",
          answer:
            "Tarjetas Visa/Mastercard, Yape, Plin, PayPal y Mercado Pago. Todos los pagos son procesados de forma segura.",
        },
        {
          question: "¿Es seguro pagar en su sitio web?",
          answer:
            "Sí. Usamos conexiones SSL y procesadores de pago certificados. La información de tarjetas no se almacena en nuestros servidores.",
        },
        {
          question: "¿Cómo funciona el pago con Yape o Plin?",
          answer:
            "Después de elegir Yape o Plin, te mostramos el QR y número para realizar la transferencia. Subís la captura y verificamos el pago para confirmar el pedido.",
        },
        {
          question: "¿Emiten boleta o factura?",
          answer:
            "Sí, ambas. Durante el checkout indicás qué tipo de comprobante necesitás.",
        },
      ]),
      faq("Envíos", [
        {
          question: "¿Cuánto demora el envío?",
          answer:
            "Lima Metropolitana: 2 a 3 días hábiles. Provincias: 3 a 7 días hábiles según la ubicación.",
        },
        {
          question: "¿Cuánto cuesta el envío?",
          answer:
            "Se calcula automáticamente en el checkout según destino y peso. Tenemos envío gratis para compras que superan ciertos montos.",
        },
        {
          question: "¿Hacen envíos a todo el Perú?",
          answer:
            "Sí, a través de Olva Courier, Shalom y otros couriers de confianza.",
        },
        {
          question: "¿Puedo recoger mi pedido en tienda?",
          answer:
            "Por ahora no contamos con recojo en tienda, pero estamos trabajando para ofrecerlo.",
        },
      ]),
      faq("Devoluciones y cambios", [
        {
          question: "¿Cuál es la política de devoluciones?",
          answer:
            "Aceptamos devoluciones dentro de los 30 días posteriores a la compra, siempre que el producto esté sin uso, en su estado original y con su empaque.",
        },
        {
          question: "¿Cómo devuelvo un producto?",
          answer:
            "Contactanos para iniciar el proceso. Te damos las instrucciones y la dirección de devolución.",
        },
        {
          question: "¿Puedo cambiar un producto por otro?",
          answer:
            "Sí, podés cambiar talla, color o modelo. Contactanos y coordinamos el cambio.",
        },
        {
          question: "¿Cuándo recibo mi reembolso?",
          answer:
            "Una vez recibido y verificado el producto, procesamos el reembolso en 5 a 10 días hábiles. La acreditación final depende de tu banco.",
        },
      ]),
      faq("Seguridad y privacidad", [
        {
          question: "¿Cómo protegen mi información personal?",
          answer:
            "Encriptamos las conexiones con SSL, cumplimos con las normas de protección de datos y nunca compartimos tu información sin consentimiento.",
        },
        {
          question: "¿Guardan mi información de pago?",
          answer:
            "No. Las tarjetas las procesan nuestros pasarelas certificadas; no se almacenan en nuestros servidores.",
        },
      ]),
      faq("Otros", [
        {
          question: "¿Los productos tienen garantía?",
          answer:
            "Todos cuentan con garantía contra defectos de fabricación. El plazo varía según el producto (ver descripción).",
        },
        {
          question: "¿Puedo comprar al por mayor?",
          answer:
            "Sí, ofrecemos descuentos para compras al por mayor. Contactanos para una cotización personalizada.",
        },
        {
          question: "¿Tienen tienda física?",
          answer:
            "Por ahora somos 100% online, lo que nos permite ofrecer mejores precios.",
        },
      ]),
    ],
  },
]

async function main() {
  console.log("Sembrando páginas estáticas migradas...")

  for (const p of PAGES) {
    const exists = await prisma.page.findUnique({
      where: { slug: p.slug },
      select: { id: true },
    })
    if (exists) {
      console.log(`  · "${p.slug}" ya existe. Skipped.`)
      continue
    }
    const page = await prisma.page.create({
      data: {
        slug: p.slug,
        title: p.title,
        description: p.description,
        active: true,
      },
      select: { id: true },
    })

    for (let i = 0; i < p.blocks.length; i++) {
      const b = p.blocks[i]
      await prisma.pageBlock.create({
        data: {
          pageId: page.id,
          type: b.type,
          position: i,
          content: b.content as object,
        },
      })
    }

    console.log(
      `  ✓ Página "${p.slug}" creada con ${p.blocks.length} bloque(s).`,
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
