import { protectRoute } from "@/lib/protect-route";
import { listLandingTemplates } from "@/actions/landing-templates";
import { TemplateLibraryGrid } from "@/components/admin/landing-templates/TemplateLibraryGrid";

export const dynamic = "force-dynamic";

export default async function LandingTemplatesPage() {
  await protectRoute("landing_templates:view");
  const templates = await listLandingTemplates();
  return <TemplateLibraryGrid initialTemplates={templates} />;
}
