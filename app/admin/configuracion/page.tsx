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

  // Convertir a objeto y extraer correctamente el valor JSON
  const settingsObject = settings.reduce((acc, setting) => {
    // Si el valor es un objeto JSON con 'url', extraer solo la URL
    if (
      setting.value &&
      typeof setting.value === "object" &&
      "url" in setting.value
    ) {
      acc[setting.key] = (setting.value as any).url;
    } else {
      acc[setting.key] = setting.value;
    }
    return acc;
  }, {} as Record<string, any>);

  console.log("📦 Settings cargados en página:", settingsObject);

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