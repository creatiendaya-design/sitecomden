// actions/cod-form-templates.ts
"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  templateUpdateSchema,
  type TemplateUpdateInput,
} from "@/lib/cod-forms/schema"
import {
  DEFAULT_BUTTON_STYLE,
  DEFAULT_TEMPLATE_BLOCKS,
  getDefaultContentForType,
} from "@/lib/cod-forms/defaults"
import type { CodFormTemplateData, ButtonStyle } from "@/lib/cod-forms/types"
import type { CheckoutMode, CodFormBlockType, PostSubmitAction } from "@prisma/client"

type SerializableTemplate = {
  id: string
  name: string
  isDefault: boolean
  buttonText: string
  buttonStyle: Prisma.JsonValue
  postSubmitAction: PostSubmitAction
  thankYouTitle: string | null
  thankYouMessage: string | null
  whatsappNumber: string | null
  whatsappMessage: string | null
  thankYouPageId: string | null
  thankYouPage?: { slug: string } | null
  blocks?: Array<{ id: string; position: number; type: string; content: Prisma.JsonValue; visible: boolean; required: boolean }>
  shippingRates?: Array<{ id: string }>
}

function serializeTemplate(t: SerializableTemplate): CodFormTemplateData {
  return {
    id: t.id,
    name: t.name,
    isDefault: t.isDefault,
    buttonText: t.buttonText,
    buttonStyle: (t.buttonStyle as ButtonStyle) ?? DEFAULT_BUTTON_STYLE,
    postSubmitAction: t.postSubmitAction,
    thankYouTitle: t.thankYouTitle,
    thankYouMessage: t.thankYouMessage,
    whatsappNumber: t.whatsappNumber,
    whatsappMessage: t.whatsappMessage,
    thankYouPageId: t.thankYouPageId,
    thankYouPageSlug: t.thankYouPage?.slug ?? null,
    blocks: (t.blocks ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((b) => ({
        id: b.id,
        position: b.position,
        type: b.type as CodFormBlockType,
        content: (b.content ?? {}) as Record<string, unknown>,
        visible: b.visible,
        required: b.required,
      })),
    shippingRateIds: ((t.shippingRates ?? []) as Array<{ id: string }>)
      .map((r) => r.id)
      .sort(),
  }
}

export async function listTemplates() {
  const { response } = await requirePermission("cod-forms:view")
  if (response) throw new Error("Forbidden")

  const templates = await prisma.codFormTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true } },
      thankYouPage: { select: { id: true, slug: true } },
    },
  })

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    isDefault: t.isDefault,
    postSubmitAction: t.postSubmitAction,
    productCount: t._count.products,
    updatedAt: t.updatedAt,
  }))
}

export async function getTemplate(id: string): Promise<CodFormTemplateData> {
  const { response } = await requirePermission("cod-forms:view")
  if (response) throw new Error("Forbidden")

  const t = await prisma.codFormTemplate.findUnique({
    where: { id },
    include: {
      blocks: { orderBy: { position: "asc" } },
      thankYouPage: { select: { slug: true } },
      shippingRates: { select: { id: true } },
    },
  })
  if (!t) throw new Error("Plantilla no encontrada")
  return serializeTemplate(t)
}

export async function createTemplate(name: string): Promise<{ id: string }> {
  const { response } = await requirePermission("cod-forms:create")
  if (response) throw new Error("Forbidden")

  const trimmed = name.trim()
  if (!trimmed) throw new Error("El nombre es obligatorio")

  const existing = await prisma.codFormTemplate.findUnique({
    where: { name: trimmed },
  })
  if (existing) throw new Error("Ya existe una plantilla con ese nombre")

  const created = await prisma.codFormTemplate.create({
    data: {
      name: trimmed,
      isDefault: false,
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
  })

  revalidatePath("/admin/formularios-cod")
  return { id: created.id }
}

export async function duplicateTemplate(id: string): Promise<{ id: string }> {
  const { response } = await requirePermission("cod-forms:create")
  if (response) throw new Error("Forbidden")

  const source = await prisma.codFormTemplate.findUnique({
    where: { id },
    include: { blocks: true },
  })
  if (!source) throw new Error("Plantilla no encontrada")

  const baseName = `${source.name} (copia)`
  let candidate = baseName
  let suffix = 1
  while (
    await prisma.codFormTemplate.findUnique({ where: { name: candidate } })
  ) {
    suffix += 1
    candidate = `${baseName} ${suffix}`
  }

  const created = await prisma.codFormTemplate.create({
    data: {
      name: candidate,
      isDefault: false,
      buttonText: source.buttonText,
      buttonStyle: source.buttonStyle as unknown as Prisma.InputJsonValue,
      postSubmitAction: source.postSubmitAction,
      thankYouTitle: source.thankYouTitle,
      thankYouMessage: source.thankYouMessage,
      whatsappNumber: source.whatsappNumber,
      whatsappMessage: source.whatsappMessage,
      thankYouPageId: source.thankYouPageId,
      blocks: {
        create: source.blocks.map((b) => ({
          position: b.position,
          type: b.type,
          visible: b.visible,
          required: b.required,
          content: b.content as unknown as Prisma.InputJsonValue,
        })),
      },
    },
  })

  revalidatePath("/admin/formularios-cod")
  return { id: created.id }
}

export async function updateTemplate(
  id: string,
  input: TemplateUpdateInput,
): Promise<{ ok: true }> {
  const { response } = await requirePermission("cod-forms:update")
  if (response) throw new Error("Forbidden")

  const parsed = templateUpdateSchema.parse(input)

  const existing = await prisma.codFormTemplate.findUnique({ where: { id } })
  if (!existing) throw new Error("Plantilla no encontrada")

  if (parsed.name !== existing.name) {
    const conflict = await prisma.codFormTemplate.findUnique({
      where: { name: parsed.name },
    })
    if (conflict && conflict.id !== id) {
      throw new Error("Ya existe una plantilla con ese nombre")
    }
  }

  if (parsed.thankYouPageId) {
    const page = await prisma.page.findUnique({
      where: { id: parsed.thankYouPageId },
      select: { id: true },
    })
    if (!page) throw new Error("La página seleccionada no existe")
  }

  await prisma.$transaction(async (tx) => {
    await tx.codFormTemplate.update({
      where: { id },
      data: {
        name: parsed.name,
        buttonText: parsed.buttonText,
        buttonStyle: parsed.buttonStyle as unknown as Prisma.InputJsonValue,
        postSubmitAction: parsed.postSubmitAction,
        thankYouTitle: parsed.thankYouTitle,
        thankYouMessage: parsed.thankYouMessage,
        whatsappNumber: parsed.whatsappNumber,
        whatsappMessage: parsed.whatsappMessage,
        thankYouPageId: parsed.thankYouPageId,
        shippingRates: {
          set: parsed.shippingRateIds.map((rid) => ({ id: rid })),
        },
      },
    })

    await tx.codFormBlock.deleteMany({ where: { templateId: id } })
    await tx.codFormBlock.createMany({
      data: parsed.blocks.map((b, idx) => ({
        templateId: id,
        position: idx,
        type: b.type,
        visible: b.visible,
        required: b.required,
        content: b.content as unknown as Prisma.InputJsonValue,
      })),
    })
  })

  // Only revalidate the list. Revalidating the detail path triggers a
  // refetch of the server component, which re-runs hydrate(template) in
  // the editor; because Postgres jsonb does not preserve key order, the
  // re-hydrated content differs from the local snapshot and the auto-save
  // effect fires another update — an infinite save loop.
  revalidatePath("/admin/formularios-cod")
  return { ok: true }
}

export async function deleteTemplate(id: string): Promise<{ ok: true }> {
  const { response } = await requirePermission("cod-forms:delete")
  if (response) throw new Error("Forbidden")

  const t = await prisma.codFormTemplate.findUnique({
    where: { id },
    select: { id: true, isDefault: true },
  })
  if (!t) throw new Error("Plantilla no encontrada")
  if (t.isDefault) throw new Error("No se puede eliminar la plantilla Default")

  const fallback = await prisma.codFormTemplate.findFirst({
    where: { isDefault: true },
    select: { id: true },
  })
  if (!fallback) {
    throw new Error("No hay plantilla Default para reasignar productos")
  }

  await prisma.$transaction([
    prisma.product.updateMany({
      where: { codFormTemplateId: id },
      data: { codFormTemplateId: fallback.id },
    }),
    prisma.codFormTemplate.delete({ where: { id } }),
  ])

  revalidatePath("/admin/formularios-cod")
  revalidatePath("/admin/productos")
  return { ok: true }
}

export async function assignTemplateToProducts(
  templateId: string,
  productIds: string[],
  checkoutMode?: CheckoutMode,
): Promise<{ updated: number }> {
  const { response } = await requirePermission("cod-forms:update")
  if (response) throw new Error("Forbidden")

  const tpl = await prisma.codFormTemplate.findUnique({
    where: { id: templateId },
    select: { id: true },
  })
  if (!tpl) throw new Error("Plantilla no encontrada")

  const data: { codFormTemplateId: string; checkoutMode?: CheckoutMode } = {
    codFormTemplateId: templateId,
  }
  if (checkoutMode) data.checkoutMode = checkoutMode

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data,
  })

  revalidatePath("/admin/productos")
  revalidatePath("/admin/formularios-cod")
  revalidatePath(`/admin/formularios-cod/${templateId}`)
  return { updated: result.count }
}

export async function unassignProductsFromTemplate(
  templateId: string,
  productIds: string[],
): Promise<{ updated: number }> {
  const { response } = await requirePermission("cod-forms:update")
  if (response) throw new Error("Forbidden")

  const fallback = await prisma.codFormTemplate.findFirst({
    where: { isDefault: true },
    select: { id: true },
  })
  if (!fallback) throw new Error("No hay plantilla Default")

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds }, codFormTemplateId: templateId },
    data: {
      codFormTemplateId: fallback.id,
      checkoutMode: "STANDARD",
    },
  })

  revalidatePath("/admin/productos")
  revalidatePath("/admin/formularios-cod")
  revalidatePath(`/admin/formularios-cod/${templateId}`)
  return { updated: result.count }
}

export async function listTemplateOptions(): Promise<
  { id: string; name: string; isDefault: boolean }[]
> {
  // Read-only: any authenticated admin can fetch this for the dropdown.
  const { response } = await requirePermission("cod-forms:view")
  if (response) return []
  return prisma.codFormTemplate.findMany({
    select: { id: true, name: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  })
}

export async function listProductsForTemplate(templateId: string) {
  const { response } = await requirePermission("cod-forms:view")
  if (response) throw new Error("Forbidden")

  return prisma.product.findMany({
    where: { codFormTemplateId: templateId },
    select: { id: true, name: true, slug: true, basePrice: true },
    orderBy: { name: "asc" },
  })
}

export async function searchProductsToAssign(query: string) {
  const { response } = await requirePermission("cod-forms:update")
  if (response) throw new Error("Forbidden")

  const q = query.trim()
  return prisma.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    select: {
      id: true,
      name: true,
      slug: true,
      codFormTemplateId: true,
    },
    take: 50,
    orderBy: { name: "asc" },
  })
}
