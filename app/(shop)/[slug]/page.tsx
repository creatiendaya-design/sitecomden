import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import LandingBlockRenderer from "@/components/shop/templates/blocks/LandingBlockRenderer"
import type { LandingBlock } from "@/lib/types/landing-blocks"
import { isReservedSlug } from "@/lib/pages/reserved-slugs"

interface DynamicPageParams {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: DynamicPageParams) {
  const { slug } = await params
  if (isReservedSlug(slug)) return {}
  const page = await prisma.page.findUnique({
    where: { slug, active: true },
    select: { title: true, description: true },
  })
  if (!page) return {}
  return {
    title: page.title,
    description: page.description ?? undefined,
  }
}

export default async function DynamicPage({ params }: DynamicPageParams) {
  const { slug } = await params
  if (isReservedSlug(slug)) notFound()

  const page = await prisma.page.findUnique({
    where: { slug, active: true },
    include: { pageBlocks: { orderBy: { position: "asc" } } },
  })
  if (!page) notFound()

  const blocks: LandingBlock[] = page.pageBlocks.map((b) => ({
    id: b.id,
    productId: "",
    type: b.type,
    position: b.position,
    content: b.content as LandingBlock["content"],
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  return (
    <div className="min-h-screen">
      <LandingBlockRenderer blocks={blocks} />
    </div>
  )
}
