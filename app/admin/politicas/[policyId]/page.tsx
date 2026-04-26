import { notFound } from "next/navigation"
import { protectRoute } from "@/lib/protect-route"
import { getPolicy } from "@/actions/policies"
import { PolicyEditor } from "@/components/admin/policies/PolicyEditor"

export const dynamic = "force-dynamic"

interface Params {
  params: Promise<{ policyId: string }>
}

export default async function EditPolicyPage({ params }: Params) {
  await protectRoute("policies:update")
  const { policyId } = await params
  const policy = await getPolicy(policyId)
  if (!policy) notFound()
  return <PolicyEditor policy={policy} />
}
