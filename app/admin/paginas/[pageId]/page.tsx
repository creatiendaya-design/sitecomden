import { protectRoute } from "@/lib/protect-route"
import { getPage } from "@/actions/pages"
import { PageBuilderShell } from "@/components/admin/pages/PageBuilderShell"
import { notFound } from "next/navigation"
import type {
  BlockInstance,
  LandingBlockType,
  BlockContentV2,
} from "@/lib/blocks/types"

export const dynamic = "force-dynamic"

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ pageId: string }>
}) {
  await protectRoute("pages:update")
  const { pageId } = await params

  const page = await getPage(pageId)
  if (!page) notFound()

  const initialBlocks: BlockInstance[] = page.pageBlocks.map((b) => ({
    id: b.id,
    type: b.type as LandingBlockType,
    position: b.position,
    content: b.content as BlockContentV2,
  }))

  return (
    <PageBuilderShell
      page={{ id: page.id, slug: page.slug, title: page.title }}
      initialBlocks={initialBlocks}
    />
  )
}
