import { protectRoute } from "@/lib/protect-route"
import { getCategoryWithBlocks } from "@/actions/categories-blocks"
import { CategoryBuilderShell } from "@/components/admin/categorias/CategoryBuilderShell"
import { notFound } from "next/navigation"
import type {
  BlockInstance,
  LandingBlockType,
  BlockContentV2,
} from "@/lib/blocks/types"

export const dynamic = "force-dynamic"

export default async function CategoryBuilderPage({
  params,
}: {
  params: Promise<{ categoryId: string }>
}) {
  await protectRoute("categories:update")
  const { categoryId } = await params

  const category = await getCategoryWithBlocks(categoryId)
  if (!category) notFound()

  const initialBlocks: BlockInstance[] = category.blocks.map((b) => ({
    id: b.id,
    type: b.type as LandingBlockType,
    position: b.position,
    content: b.content as BlockContentV2,
  }))

  return (
    <CategoryBuilderShell
      category={{
        id: category.id,
        slug: category.slug,
        name: category.name,
      }}
      initialBlocks={initialBlocks}
    />
  )
}
