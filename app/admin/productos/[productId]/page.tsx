export const dynamic = "force-dynamic"

import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import EditProductForm from "@/components/admin/EditProductForm"
import { ProductLandingBuilder } from "@/components/admin/ProductLandingBuilder"
import { isPageBuilderV2Enabled } from "@/lib/blocks/feature-flag"
import type { BlockInstance } from "@/lib/blocks/types"
import { resolveProductBlocksFromLoaded } from "@/lib/blocks/resolve-product-blocks"
import { listPromotionsForProduct } from "@/actions/promotions"
import type { ShippingRestriction } from "@/lib/cod-forms/types"
import type { MockupOverrides } from "@/lib/customizer/types"
import type React from "react"

interface EditProductPageProps {
  params: Promise<{
    productId: string
  }>
  searchParams?: Promise<{ tab?: string }>
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const { productId } = await params
  const sp = (await searchParams) ?? {}
  const flagOn = await isPageBuilderV2Enabled()

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      categories: { include: { category: true } },
      variants: { orderBy: { createdAt: "asc" } },
      options: {
        include: { values: { orderBy: { position: "asc" } } },
        orderBy: { position: "asc" },
      },
      landingBlocks: { orderBy: { position: "asc" } },
    },
  })

  if (!product) notFound()

  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const serializedCategories = categories.map((c) => ({ id: c.id, name: c.name }))

  const serializedPromotions = await listPromotionsForProduct(productId)

  const serializedProduct = {
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    weight: product.weight ? Number(product.weight) : null,
    images: (product.images ?? []) as string[],
    shippingRestriction: product.shippingRestriction as ShippingRestriction | null,
    customizableMockupOverrides: product.customizableMockupOverrides as MockupOverrides | null,
    variants: product.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      weight: v.weight ? Number(v.weight) : null,
    })),
  }

  // When the v2 flag is ON AND the admin opened the landing tab, render the
  // full-screen builder instead of the form-based editor.
  if (flagOn && sp.tab === "landing") {
    const resolved = await resolveProductBlocksFromLoaded({
      id: product.id,
      landingTemplateId: product.landingTemplateId,
      landingBlocks: product.landingBlocks.map((b) => ({
        id: b.id,
        type: b.type,
        position: b.position,
        content: b.content,
        sourceTemplateBlockId: b.sourceTemplateBlockId,
        detached: b.detached,
        version: b.version,
      })),
    })

    const blocks: BlockInstance[] = resolved.map((r) => ({
      id: r.id,
      type: r.type,
      position: r.position,
      content: r.content,
      sourceTemplateBlockId: r.sourceTemplateBlockId,
      detached: r.origin === "detached",
      origin: r.origin,
      version: r.version,
    }))

    return (
      <ProductLandingBuilder
        product={{ id: product.id, slug: product.slug, name: product.name }}
        initialBlocks={blocks}
        currentTemplateId={product.landingTemplateId}
        currentBlockCount={resolved.length}
      />
    )
  }

  // Resolve blocks (template + detached + locals) so the Presentación card
  // can show what will actually render on the storefront, not just the
  // raw landing blocks of this product.
  const resolved = await resolveProductBlocksFromLoaded({
    id: product.id,
    landingTemplateId: product.landingTemplateId,
    landingBlocks: product.landingBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content,
      sourceTemplateBlockId: b.sourceTemplateBlockId,
      detached: b.detached,
      version: b.version,
    })),
  })
  const resolvedBlockTypes = resolved.map((r) => r.type as string)

  return <EditProductForm
    product={serializedProduct as unknown as React.ComponentProps<typeof EditProductForm>["product"]}
    categories={serializedCategories}
    showLegacyLandingEditor={!flagOn}
    resolvedBlockTypes={resolvedBlockTypes}
    initialPromotions={serializedPromotions}
  />
}
