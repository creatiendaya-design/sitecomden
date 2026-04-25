import { protectRoute } from "@/lib/protect-route"
import { listPages } from "@/actions/pages"
import { PageListGrid } from "@/components/admin/pages/PageListGrid"

export const dynamic = "force-dynamic"

export default async function PagesListPage() {
  await protectRoute("pages:view")
  const pages = await listPages()
  return <PageListGrid initialPages={pages} />
}
