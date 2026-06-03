// scripts/seed-cod-form-default.ts
// Creates the singleton "Default" CodFormTemplate with its initial blocks.
// Idempotent - does nothing if a template with isDefault=true already exists.
//
// Run once after deploying the schema:
//   npx tsx scripts/seed-cod-form-default.ts
import { PrismaClient, Prisma } from "@prisma/client"
import {
  DEFAULT_BUTTON_STYLE,
  DEFAULT_TEMPLATE_BLOCKS,
  DEFAULT_TEMPLATE_NAME,
  getDefaultContentForType,
} from "../lib/cod-forms/defaults"

const prisma = new PrismaClient()

async function main() {
  console.log("Sembrando plantilla COD Default...")

  const existing = await prisma.codFormTemplate.findFirst({
    where: { isDefault: true },
  })
  if (existing) {
    console.log(`Plantilla Default ya existe (id=${existing.id}). Sin cambios.`)
    return
  }

  const template = await prisma.codFormTemplate.create({
    data: {
      name: DEFAULT_TEMPLATE_NAME,
      isDefault: true,
      buttonText: "Realizar Pedido y Pagar al Recibir - {total}",
      buttonStyle: DEFAULT_BUTTON_STYLE as unknown as Prisma.InputJsonValue,
      postSubmitAction: "INLINE_THANK_YOU",
      thankYouTitle: "¡Gracias por tu pedido!",
      thankYouMessage:
        "Nos comunicaremos contigo en breve para coordinar la entrega.",
      blocks: {
        create: DEFAULT_TEMPLATE_BLOCKS.map((b, idx) => ({
          position: idx,
          type: b.type,
          visible: b.visible,
          required: b.required,
          content: getDefaultContentForType(b.type) as unknown as Prisma.InputJsonValue,
        })),
      },
    },
    include: { blocks: true },
  })

  console.log(
    `Plantilla Default creada (id=${template.id}, ${template.blocks.length} bloques).`,
  )
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
