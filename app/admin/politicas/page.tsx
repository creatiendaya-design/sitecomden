import { protectRoute } from "@/lib/protect-route"
import { listPolicies } from "@/actions/policies"
import { PolicyListTable } from "@/components/admin/policies/PolicyListTable"

export const dynamic = "force-dynamic"

export default async function PoliciesListPage() {
  await protectRoute("policies:view")
  const policies = await listPolicies()
  return <PolicyListTable initialPolicies={policies} />
}
