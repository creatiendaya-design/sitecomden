"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SiteSettingsFormProps {
  initialSettings: Record<string, any>;
}

export default function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // General
    site_name: initialSettings.site_name || "ShopGood Perú",
    site_url: initialSettings.site_url || "https://shopgood.pe",

    // SEO Home
    seo_home_title: initialSettings.seo_home_title || "",
    seo_home_description: initialSettings.seo_home_description || "",
    seo_home_keywords: initialSettings.seo_home_keywords || "",

    // Contact
    contact_email: initialSettings.contact_email || "",
    contact_phone: initialSettings.contact_phone || "",
    contact_address: initialSettings.contact_address || "",

    // Social
    social_facebook: initialSettings.social_facebook || "",
    social_instagram: initialSettings.social_instagram || "",
    social_twitter: initialSettings.social_twitter || "",
    social_tiktok: initialSettings.social_tiktok || "",
  });

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Error al guardar");

      toast.success("Configuración guardada correctamente");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm("¿Estás seguro de restaurar los valores por defecto? Esto sobrescribirá tu configuración actual.")) {
      setSettings({
        site_name: "ShopGood Perú",
        site_url: "https://shopgood.pe",
        seo_home_title: "ShopGood Perú - Los Mejores Productos con Envío a Todo el País",
        seo_home_description: "Compra en línea con envío a todo el Perú. Múltiples métodos de pago: tarjeta, Yape, Plin, PayPal. Los mejores productos al mejor precio.",
        seo_home_keywords: "tienda online Perú, comprar en línea, envío Perú, Yape, Plin, e-commerce",
        contact_email: "contacto@shopgood.pe",
        contact_phone: "+51 999 999 999",
        contact_address: "Lima, Perú",
        social_facebook: "",
        social_instagram: "",
        social_twitter: "",
        social_tiktok: "",
      });
      toast.info("Valores restaurados a los predeterminados. Haz clic en 'Guardar' para aplicar los cambios.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        {/* Tabs responsive: 2 columnas móvil, 4 columnas desktop */}
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="general" className="text-xs sm:text-sm py-2 sm:py-2.5">
            General
          </TabsTrigger>
          <TabsTrigger value="seo" className="text-xs sm:text-sm py-2 sm:py-2.5">
            SEO
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs sm:text-sm py-2 sm:py-2.5">
            Contacto
          </TabsTrigger>
          <TabsTrigger value="social" className="text-xs sm:text-sm py-2 sm:py-2.5">
            Redes
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Información General</CardTitle>
              <CardDescription className="text-sm">
                Configuración básica de tu tienda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                <Label htmlFor="site_name" className="text-sm sm:text-base">
                  Nombre del Sitio
                </Label>
                <Input
                  id="site_name"
                  value={settings.site_name}
                  onChange={(e) => handleChange("site_name", e.target.value)}
                  placeholder="ShopGood Perú"
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_url" className="text-sm sm:text-base">
                  URL del Sitio
                </Label>
                <Input
                  id="site_url"
                  type="url"
                  value={settings.site_url}
                  onChange={(e) => handleChange("site_url", e.target.value)}
                  placeholder="https://shopgood.pe"
                  className="text-sm sm:text-base"
                />
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Usado para sitemap y structured data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">SEO del Home</CardTitle>
              <CardDescription className="text-sm">
                Optimiza cómo aparece tu sitio en Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="space-y-2">
                <Label htmlFor="seo_home_title" className="text-sm sm:text-base">
                  Título (Meta Title)
                </Label>
                <Input
                  id="seo_home_title"
                  value={settings.seo_home_title}
                  onChange={(e) => handleChange("seo_home_title", e.target.value)}
                  placeholder="ShopGood Perú - Los Mejores Productos"
                  maxLength={60}
                  className="text-sm sm:text-base"
                />
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Máximo 60 caracteres ({settings.seo_home_title.length}/60)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_home_description" className="text-sm sm:text-base">
                  Descripción (Meta Description)
                </Label>
                <Textarea
                  id="seo_home_description"
                  value={settings.seo_home_description}
                  onChange={(e) => handleChange("seo_home_description", e.target.value)}
                  placeholder="Compra en línea con envío a todo el Perú..."
                  rows={3}
                  maxLength={160}
                  className="text-sm sm:text-base resize-none"
                />
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Máximo 160 caracteres ({settings.seo_home_description.length}/160)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_home_keywords" className="text-sm sm:text-base">
                  Palabras Clave
                </Label>
                <Input
                  id="seo_home_keywords"
                  value={settings.seo_home_keywords}
                  onChange={(e) => handleChange("seo_home_keywords", e.target.value)}
                  placeholder="tienda online, Perú, Yape, Plin"
                  className="text-sm sm:text-base"
                />
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Separadas por comas
                </p>
              </div>

              {/* Nota para el usuario */}
              <div className="rounded-lg border bg-blue-50 dark:bg-blue-950 p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  💡 <strong>Nota:</strong> La imagen Open Graph se configura en la sección 
                  "Imágenes del Sitio" al inicio de esta página.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Información de Contacto</CardTitle>
              <CardDescription className="text-sm">
                Datos de contacto que aparecerán en el sitio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_email" className="text-sm sm:text-base">
                    Email
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => handleChange("contact_email", e.target.value)}
                    placeholder="contacto@shopgood.pe"
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone" className="text-sm sm:text-base">
                    Teléfono
                  </Label>
                  <Input
                    id="contact_phone"
                    value={settings.contact_phone}
                    onChange={(e) => handleChange("contact_phone", e.target.value)}
                    placeholder="+51 999 999 999"
                    className="text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_address" className="text-sm sm:text-base">
                  Dirección
                </Label>
                <Textarea
                  id="contact_address"
                  value={settings.contact_address}
                  onChange={(e) => handleChange("contact_address", e.target.value)}
                  placeholder="Av. Ejemplo 123, Miraflores, Lima, Perú"
                  rows={2}
                  className="text-sm sm:text-base resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Redes Sociales</CardTitle>
              <CardDescription className="text-sm">
                Enlaces a tus redes sociales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="social_facebook" className="text-sm sm:text-base">
                    Facebook
                  </Label>
                  <Input
                    id="social_facebook"
                    value={settings.social_facebook}
                    onChange={(e) => handleChange("social_facebook", e.target.value)}
                    placeholder="https://facebook.com/shopgood"
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social_instagram" className="text-sm sm:text-base">
                    Instagram
                  </Label>
                  <Input
                    id="social_instagram"
                    value={settings.social_instagram}
                    onChange={(e) => handleChange("social_instagram", e.target.value)}
                    placeholder="https://instagram.com/shopgood"
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social_twitter" className="text-sm sm:text-base">
                    Twitter / X
                  </Label>
                  <Input
                    id="social_twitter"
                    value={settings.social_twitter}
                    onChange={(e) => handleChange("social_twitter", e.target.value)}
                    placeholder="https://twitter.com/shopgood"
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social_tiktok" className="text-sm sm:text-base">
                    TikTok
                  </Label>
                  <Input
                    id="social_tiktok"
                    value={settings.social_tiktok}
                    onChange={(e) => handleChange("social_tiktok", e.target.value)}
                    placeholder="https://tiktok.com/@shopgood"
                    className="text-sm sm:text-base"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones de acción - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-4 sm:pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleResetToDefaults}
          disabled={loading}
          className="w-full sm:w-auto text-sm"
        >
          <span className="hidden sm:inline">Restaurar Valores por Defecto</span>
          <span className="sm:hidden">Restaurar Defecto</span>
        </Button>
        
        <Button 
          type="submit" 
          size="lg" 
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="hidden sm:inline">Guardando...</span>
              <span className="sm:hidden">...</span>
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Guardar Configuración</span>
              <span className="sm:hidden">Guardar</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}