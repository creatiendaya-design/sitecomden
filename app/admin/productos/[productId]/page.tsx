export const dynamic = "force-dynamic"

import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import EditProductForm from "@/components/admin/EditProductForm"
import { ProductLandingBuilder } from "@/components/admin/ProductLandingBuilder"
import { isPageBuilderV2Enabled } from "@/lib/blocks/feature-flag"
import type { BlockInstance, BlockContentV2 } from "@/lib/blocks/types"

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

  const serializedProduct = {
    ...product,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    weight: product.weight ? Number(product.weight) : null,
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
    const blocks: BlockInstance[] = product.landingBlocks.map((b) => ({
      id: b.id,
      type: b.type,
      position: b.position,
      content: b.content as unknown as BlockContentV2,
      sourceTemplateBlockId: b.sourceTemplateBlockId,
      detached: b.detached,
    }))

    return (
      <ProductLandingBuilder
        product={{ id: product.id, slug: product.slug, name: product.name }}
        initialBlocks={blocks}
        currentTemplateId={product.landingTemplateId}
        currentBlockCount={product.landingBlocks.length}
      />
    )
  }

  return <EditProductForm
    product={serializedProduct}
    categories={serializedCategories}
    showLegacyLandingEditor={!flagOn}
  />
}
