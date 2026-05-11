import { protectRoute } from "@/lib/protect-route";
import { TemplateForm } from "@/components/admin/customizer-templates/TemplateForm";

export default async function NewTemplatePage() {
  await protectRoute("customizables:create");
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Nueva plantilla personalizable</h1>
      <TemplateForm initial={null} />
    </div>
  );
}
