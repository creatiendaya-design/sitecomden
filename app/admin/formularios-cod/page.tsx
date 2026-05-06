import { protectRoute } from "@/lib/protect-route"
import { listTemplates } from "@/actions/cod-form-templates"
import CodFormTemplatesList from "@/components/admin/cod-forms/CodFormTemplatesList"

export const metadata = { title: "Formularios COD | Admin" }

export default async function FormulariosCodPage() {
  await protectRoute("cod-forms:view")
  const templates = await listTemplates()
  return <CodFormTemplatesList templates={templates} />
}
