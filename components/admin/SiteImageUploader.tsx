"use client";

import { useState, useEffect } from "react";
import {
  uploadSiteImage,
  deleteSiteImage,
  getSiteImageSettings,
  type SiteImageSettings,
} from "@/actions/site-image-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, X, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

export default function SiteImageUploader() {
  const [settings, setSettings] = useState<SiteImageSettings>({
    logo: null,
    favicon: null,
    ogImage: null,
  });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"logo" | "favicon" | "ogImage" | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const loadedSettings = await getSiteImageSettings();
    setSettings(loadedSettings);
    setLoading(false);
  };

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    imageType: "logo" | "favicon" | "ogImage"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(imageType);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("imageType", imageType);

    const result = await uploadSiteImage(formData);

    if (result.success && result.url) {
      setSettings((prev) => ({
        ...prev,
        [imageType]: result.url,
      }));
      setSuccess(
        imageType === "logo"
          ? "Logo actualizado correctamente"
          : imageType === "favicon"
          ? "Favicon actualizado correctamente"
          : "Imagen Open Graph actualizada correctamente"
      );
      setTimeout(() => setSuccess(null), 3000);
      
      await loadSettings();
    } else {
      setError(result.error || "Error al subir imagen");
    }

    setUploading(null);
    e.target.value = "";
  };

  const handleDelete = async (imageType: "logo" | "favicon" | "ogImage") => {
    const confirmText = 
      imageType === "logo" ? "logo" :
      imageType === "favicon" ? "favicon" :
      "imagen Open Graph";

    if (!confirm(`¿Estás seguro de eliminar el ${confirmText}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    const result = await deleteSiteImage(imageType);

    if (result.success) {
      setSettings((prev) => ({
        ...prev,
        [imageType]: null,
      }));
      setSuccess(
        imageType === "logo"
          ? "Logo eliminado correctamente"
          : imageType === "favicon"
          ? "Favicon eliminado correctamente"
          : "Imagen Open Graph eliminada correctamente"
      );
      setTimeout(() => setSuccess(null), 3000);
      
      await loadSettings();
    } else {
      setError(result.error || "Error al eliminar imagen");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          Imágenes del Sitio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-600 dark:text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Logo */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm sm:text-base">Logo del Sitio</Label>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Logo que aparece en el header y footer (Recomendado: PNG transparente, 200x50px)
            </p>
          </div>

          {settings.logo ? (
            <div className="space-y-3">
              <div className="relative w-full max-w-sm h-20 sm:h-24 rounded-lg border-2 overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src={settings.logo}
                  alt="Logo del sitio"
                  width={200}
                  height={50}
                  className="object-contain max-h-16 sm:max-h-20"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="logo-upload" className="flex-1 sm:flex-initial">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading === "logo"}
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <span>
                      {uploading === "logo" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Subiendo...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Cambiar Logo</span>
                          <span className="sm:hidden">Cambiar</span>
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, "logo")}
                  disabled={uploading === "logo"}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete("logo")}
                  disabled={uploading === "logo"}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="logo-upload-new"
                className="flex flex-col items-center justify-center w-full max-w-sm h-28 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center py-4 sm:py-6">
                  {uploading === "logo" ? (
                    <Loader2 className="h-8 sm:h-10 w-8 sm:w-10 text-gray-400 animate-spin mb-2" />
                  ) : (
                    <Upload className="h-8 sm:h-10 w-8 sm:w-10 text-gray-400 mb-2" />
                  )}
                  <p className="text-xs sm:text-sm text-gray-500">
                    {uploading === "logo"
                      ? "Subiendo logo..."
                      : "Click para subir logo"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, SVG (MAX. 2MB)
                  </p>
                </div>
                <input
                  id="logo-upload-new"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, "logo")}
                  disabled={uploading === "logo"}
                />
              </label>
            </div>
          )}
        </div>

        <div className="border-t" />

        {/* Favicon */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm sm:text-base">Favicon</Label>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Ícono que aparece en la pestaña del navegador (Recomendado: ICO, PNG o SVG, 32x32px)
            </p>
          </div>

          {settings.favicon ? (
            <div className="space-y-3">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src={settings.favicon}
                  alt="Favicon del sitio"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="favicon-upload" className="flex-1 sm:flex-initial">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading === "favicon"}
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <span>
                      {uploading === "favicon" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Subiendo...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Cambiar Favicon</span>
                          <span className="sm:hidden">Cambiar</span>
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <input
                  id="favicon-upload"
                  type="file"
                  className="hidden"
                  accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                  onChange={(e) => handleUpload(e, "favicon")}
                  disabled={uploading === "favicon"}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete("favicon")}
                  disabled={uploading === "favicon"}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="favicon-upload-new"
                className="flex flex-col items-center justify-center w-28 h-28 sm:w-32 sm:h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center">
                  {uploading === "favicon" ? (
                    <Loader2 className="h-7 sm:h-8 w-7 sm:w-8 text-gray-400 animate-spin mb-2" />
                  ) : (
                    <Upload className="h-7 sm:h-8 w-7 sm:w-8 text-gray-400 mb-2" />
                  )}
                  <p className="text-xs text-gray-500 text-center px-2">
                    {uploading === "favicon"
                      ? "Subiendo..."
                      : "Click para subir"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ICO, PNG, SVG
                  </p>
                </div>
                <input
                  id="favicon-upload-new"
                  type="file"
                  className="hidden"
                  accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml"
                  onChange={(e) => handleUpload(e, "favicon")}
                  disabled={uploading === "favicon"}
                />
              </label>
            </div>
          )}
        </div>

        <div className="border-t" />

        {/* Open Graph Image */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm sm:text-base">Imagen Open Graph (OG Image)</Label>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Imagen que aparece al compartir tu sitio en redes sociales (Recomendado: 1200x630px)
            </p>
          </div>

          {settings.ogImage ? (
            <div className="space-y-3">
              <div className="relative w-full max-w-md h-40 sm:h-48 rounded-lg border-2 overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src={settings.ogImage}
                  alt="Open Graph Image"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="og-image-upload" className="flex-1 sm:flex-initial">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading === "ogImage"}
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <span>
                      {uploading === "ogImage" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Subiendo...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          <span className="hidden sm:inline">Cambiar Imagen</span>
                          <span className="sm:hidden">Cambiar</span>
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <input
                  id="og-image-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, "ogImage")}
                  disabled={uploading === "ogImage"}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete("ogImage")}
                  disabled={uploading === "ogImage"}
                  className="w-full sm:w-auto"
                >
                  <X className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="og-image-upload-new"
                className="flex flex-col items-center justify-center w-full max-w-md h-40 sm:h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center">
                  {uploading === "ogImage" ? (
                    <Loader2 className="h-8 sm:h-10 w-8 sm:w-10 text-gray-400 animate-spin mb-2" />
                  ) : (
                    <Upload className="h-8 sm:h-10 w-8 sm:w-10 text-gray-400 mb-2" />
                  )}
                  <p className="text-xs sm:text-sm text-gray-500 text-center px-2">
                    {uploading === "ogImage"
                      ? "Subiendo imagen..."
                      : "Click para subir imagen OG"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG (1200x630px, MAX. 2MB)
                  </p>
                </div>
                <input
                  id="og-image-upload-new"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, "ogImage")}
                  disabled={uploading === "ogImage"}
                />
              </label>
            </div>
          )}
        </div>

        {/* Información */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong className="text-sm sm:text-base">Recomendaciones:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs sm:text-sm">
              <li>Logo: PNG transparente, ancho recomendado 200-300px</li>
              <li>Favicon: ICO o PNG, 32x32px o 16x16px</li>
              <li>OG Image: JPG o PNG, 1200x630px (proporción 1.91:1)</li>
              <li>Peso máximo: 2MB por archivo</li>
              <li>Los cambios se aplicarán inmediatamente en todo el sitio</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}