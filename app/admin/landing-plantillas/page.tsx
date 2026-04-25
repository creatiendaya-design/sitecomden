import { protectRoute } from "@/lib/protect-route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Entry point of "Personalizar tienda" — Shopify-style. Redirects straight
 * into the page builder for the most-recently-updated active template.
 *
 * If no templates exist yet, render an onboarding screen prompting to create
 * the first template (the actual library lives at /biblioteca).
 */
export default async function LandingTemplatesEntryPage() {
  await protectRoute("landing_templates:view");

  const firstActive = await prisma.landingTemplate.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (firstActive) {
    redirect(`/admin/landing-plantillas/${firstActive.id}`);
  }

  // Empty state — no active templates yet.
  return (
    <div className="container mx-auto py-16 max-w-xl text-center">
      <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <FolderOpen className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Aún no hay plantillas</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Crea tu primera plantilla para reutilizar el mismo diseño en varios
        productos. Los cambios a la plantilla se propagan automáticamente.
      </p>
      <div className="flex gap-2 justify-center">
        <Button asChild>
          <Link href="/admin/landing-plantillas/biblioteca">
            <Plus className="mr-2 h-4 w-4" />
            Crear primera plantilla
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/landing-plantillas/biblioteca">
            <FolderOpen className="mr-2 h-4 w-4" />
            Ver biblioteca
          </Link>
        </Button>
      </div>
    </div>
  );
}
