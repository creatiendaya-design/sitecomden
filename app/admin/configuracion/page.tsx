import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Settings,
  Mail,
  CreditCard,
  FileText,
  Users,
  Shield,
  Database,
} from "lucide-react";
import { protectRoute } from "@/lib/protect-route";
import { prisma } from "@/lib/db";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import SiteImageUploader from "@/components/admin/SiteImageUploader";

export default async function ConfiguracionPage() {
  // Proteger la página
  await protectRoute("settings:view");

  // Cargar configuración actual del sitio
  const siteSettings = await prisma.setting.findMany({
    where: {
      OR: [
        { category: "seo" },
        { category: "general" },
        { category: "contact" },
        { category: "social" },
      ],
    },
  });

  // Convertir array de settings a objeto
  const settingsObject = siteSettings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  const otherSettingsOptions = [
    {
      title: "Métodos de Pago",
      description: "Configura Yape, Plin, Culqi y otros métodos de pago",
      icon: CreditCard,
      href: "/admin/configuracion/pagos",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Configuración de Emails",
      description: "Gestiona plantillas y configuración de correos",
      icon: Mail,
      href: "/admin/configuracion/emails",
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Culqi (Tarjetas)",
      description: "Configura claves API de Culqi para pagos con tarjeta",
      icon: Shield,
      href: "/admin/configuracion/culqi",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Gestión de Usuarios",
      description: "Administra usuarios del panel admin",
      icon: Users,
      href: "/admin/configuracion/usuarios",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
    {
      title: "Roles y Permisos",
      description: "Configura roles y permisos de acceso",
      icon: Database,
      href: "/admin/configuracion/roles",
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Libro de Reclamaciones",
      description: "Configura el formulario de reclamaciones",
      icon: FileText,
      href: "/admin/libro-reclamaciones",
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona la configuración general de tu tienda
        </p>
      </div>

      {/* Upload de Imágenes (Logo, Favicon, OG Image) */}
      <SiteImageUploader />

      {/* Formulario de Configuración General */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl">Configuración del Sitio</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                SEO, información de contacto, redes sociales y más
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SiteSettingsForm initialSettings={settingsObject} />
        </CardContent>
      </Card>

      {/* Separador */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Otras Configuraciones
          </span>
        </div>
      </div>

      {/* Tarjetas de Navegación a Otras Secciones */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {otherSettingsOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Link key={option.href} href={option.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${option.bgColor}`}>
                      <Icon className={`h-6 w-6 ${option.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">
                        {option.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                Centro de Configuración
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Desde aquí puedes gestionar todos los aspectos técnicos y operativos de tu
                e-commerce. Modifica la configuración general arriba o selecciona una sección
                específica de las tarjetas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}