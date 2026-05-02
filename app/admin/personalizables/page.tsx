// app/admin/personalizables/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { protectRoute } from "@/lib/protect-route";
import { listCustomizableTemplates } from "@/actions/customizer";
import { TemplatesList } from "@/components/admin/customizer-templates/TemplatesList";

export const dynamic = "force-dynamic";

export default async function PersonalizablesPage() {
  await protectRoute("customizables:view");
  const templates = await listCustomizableTemplates();

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Plantillas personalizables</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plantillas reusables que el cliente final usa para personalizar productos.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/personalizables/nuevo">Nueva plantilla</Link>
        </Button>
      </div>
      <TemplatesList templates={templates} />
    </div>
  );
}
