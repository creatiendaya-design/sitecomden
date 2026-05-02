import { notFound } from "next/navigation";
import { protectRoute } from "@/lib/protect-route";
import { TemplateForm } from "@/components/admin/customizer-templates/TemplateForm";
import { getCustomizableTemplate } from "@/actions/customizer";

interface Props {
  params: Promise<{ templateId: string }>;
}

export default async function EditTemplatePage({ params }: Props) {
  await protectRoute("customizables:update");
  const { templateId } = await params;
  const template = await getCustomizableTemplate(templateId);
  if (!template) notFound();
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">{template.name}</h1>
      <TemplateForm initial={template} />
    </div>
  );
}
