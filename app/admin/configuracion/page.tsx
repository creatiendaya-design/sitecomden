import { prisma } from "@/lib/db";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import SiteImageUploader from "@/components/admin/SiteImageUploader";

export default async function SiteSettingsPage() {
  // Obtener settings actuales
  const settings = await prisma.setting.findMany({
    where: {
      OR: [
        { category: "seo" },
        { category: "general" },
        { category: "contact" },
        { category: "social" },
      ],
    },
  });

  // Convertir a objeto
  const settingsObject = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Configuración del Sitio
        </h1>
        <p className="text-muted-foreground">
          Administra el SEO, redes sociales y contacto de tu tienda
        </p>
      </div>

      {/* Logo y Favicon */}
      <SiteImageUploader />

      {/* Resto de configuración */}
      <SiteSettingsForm initialSettings={settingsObject} />
    </div>
  );
}