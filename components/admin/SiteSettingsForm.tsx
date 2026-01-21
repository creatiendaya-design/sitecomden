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
    // General - EXCLUIR site_logo y site_favicon
    site_name: initialSettings.site_name || "ShopGood Perú",
    site_url: initialSettings.site_url || "https://shopgood.pe",

    // SEO Home
    seo_home_title: initialSettings.seo_home_title || "",
    seo_home_description: initialSettings.seo_home_description || "",
    seo_home_keywords: initialSettings.seo_home_keywords || "",
    seo_home_og_image: initialSettings.seo_home_og_image || "",

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
        seo_home_og_image: "/og-image.jpg",
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
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="contact">Contacto</TabsTrigger>
          <TabsTrigger value="social">Redes Sociales</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Configuración básica de tu tienda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="site_name">Nombre del Sitio</Label>
                <Input
                  id="site_name"
                  value={settings.site_name}
                  onChange={(e) => handleChange("site_name", e.target.value)}
                  placeholder="ShopGood Perú"
                />
              </div>

              <div>
                <Label htmlFor="site_url">URL del Sitio</Label>
                <Input
                  id="site_url"
                  type="url"
                  value={settings.site_url}
                  onChange={(e) => handleChange("site_url", e.target.value)}
                  placeholder="https://shopgood.pe"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Usado para sitemap y structured data
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO del Home</CardTitle>
              <CardDescription>
                Optimiza cómo aparece tu sitio en Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo_home_title">Título (Meta Title)</Label>
                <Input
                  id="seo_home_title"
                  value={settings.seo_home_title}
                  onChange={(e) => handleChange("seo_home_title", e.target.value)}
                  placeholder="ShopGood Perú - Los Mejores Productos"
                  maxLength={60}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Máximo 60 caracteres ({settings.seo_home_title.length}/60)
                </p>
              </div>

              <div>
                <Label htmlFor="seo_home_description">Descripción (Meta Description)</Label>
                <Textarea
                  id="seo_home_description"
                  value={settings.seo_home_description}
                  onChange={(e) => handleChange("seo_home_description", e.target.value)}
                  placeholder="Compra en línea con envío a todo el Perú..."
                  rows={3}
                  maxLength={160}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Máximo 160 caracteres ({settings.seo_home_description.length}/160)
                </p>
              </div>

              <div>
                <Label htmlFor="seo_home_keywords">Palabras Clave</Label>
                <Input
                  id="seo_home_keywords"
                  value={settings.seo_home_keywords}
                  onChange={(e) => handleChange("seo_home_keywords", e.target.value)}
                  placeholder="tienda online, Perú, Yape, Plin"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Separadas por comas
                </p>
              </div>

              
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
              <CardDescription>
                Datos de contacto que aparecerán en el sitio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => handleChange("contact_email", e.target.value)}
                  placeholder="contacto@shopgood.pe"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input
                  id="contact_phone"
                  value={settings.contact_phone}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                  placeholder="+51 999 999 999"
                />
              </div>

              <div>
                <Label htmlFor="contact_address">Dirección</Label>
                <Textarea
                  id="contact_address"
                  value={settings.contact_address}
                  onChange={(e) => handleChange("contact_address", e.target.value)}
                  placeholder="Av. Ejemplo 123, Miraflores, Lima, Perú"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redes Sociales</CardTitle>
              <CardDescription>
                Enlaces a tus redes sociales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="social_facebook">Facebook</Label>
                <Input
                  id="social_facebook"
                  value={settings.social_facebook}
                  onChange={(e) => handleChange("social_facebook", e.target.value)}
                  placeholder="https://facebook.com/shopgood"
                />
              </div>

              <div>
                <Label htmlFor="social_instagram">Instagram</Label>
                <Input
                  id="social_instagram"
                  value={settings.social_instagram}
                  onChange={(e) => handleChange("social_instagram", e.target.value)}
                  placeholder="https://instagram.com/shopgood"
                />
              </div>

              <div>
                <Label htmlFor="social_twitter">Twitter / X</Label>
                <Input
                  id="social_twitter"
                  value={settings.social_twitter}
                  onChange={(e) => handleChange("social_twitter", e.target.value)}
                  placeholder="https://twitter.com/shopgood"
                />
              </div>

              <div>
                <Label htmlFor="social_tiktok">TikTok</Label>
                <Input
                  id="social_tiktok"
                  value={settings.social_tiktok}
                  onChange={(e) => handleChange("social_tiktok", e.target.value)}
                  placeholder="https://tiktok.com/@shopgood"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones de acción */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleResetToDefaults}
          disabled={loading}
        >
          Restaurar Valores por Defecto
        </Button>
        
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </form>
  );
}