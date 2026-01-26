"use client";

import { useState, useEffect } from "react";
import {
  getAllPixels,
  savePixel,
  deletePixel,
  type PixelPlatform,
  type FacebookConfig,
  type TikTokConfig,
  type GoogleAdsConfig,
  type GoogleAnalyticsConfig,
} from "@/actions/tracking-pixels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Trash2,
  Facebook,
  Activity,
  BarChart,
  TrendingUp,
} from "lucide-react";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import { toast } from "sonner";

export default function PixelesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<PixelPlatform | null>(null);

  // Estados para cada plataforma
  const [facebookData, setFacebookData] = useState<{
    config: FacebookConfig;
    enabled: boolean;
    testMode: boolean;
    description: string;
  }>({
    config: { pixelId: "", accessToken: "", testEventCode: "" },
    enabled: false,
    testMode: true,
    description: "",
  });

  const [tiktokData, setTiktokData] = useState<{
    config: TikTokConfig;
    enabled: boolean;
    testMode: boolean;
    description: string;
  }>({
    config: { pixelId: "", accessToken: "" },
    enabled: false,
    testMode: true,
    description: "",
  });

  const [googleAdsData, setGoogleAdsData] = useState<{
    config: GoogleAdsConfig;
    enabled: boolean;
    testMode: boolean;
    description: string;
  }>({
    config: { conversionId: "", conversionLabel: "" },
    enabled: false,
    testMode: true,
    description: "",
  });

  const [googleAnalyticsData, setGoogleAnalyticsData] = useState<{
    config: GoogleAnalyticsConfig;
    enabled: boolean;
    testMode: boolean;
    description: string;
  }>({
    config: { measurementId: "", apiSecret: "" },
    enabled: false,
    testMode: true,
    description: "",
  });

  // Control de visibilidad de tokens
  const [showTokens, setShowTokens] = useState({
    facebook: false,
    tiktok: false,
    googleAnalytics: false,
  });

  // Cargar configuración al montar
  useEffect(() => {
    loadPixels();
  }, []);

  const loadPixels = async () => {
    setLoading(true);
    const result = await getAllPixels();

    if (result.success && result.pixels) {
      result.pixels.forEach((pixel) => {
        switch (pixel.platform) {
          case "FACEBOOK":
            setFacebookData({
              config: pixel.config as FacebookConfig,
              enabled: pixel.enabled,
              testMode: pixel.testMode,
              description: pixel.description || "",
            });
            break;
          case "TIKTOK":
            setTiktokData({
              config: pixel.config as TikTokConfig,
              enabled: pixel.enabled,
              testMode: pixel.testMode,
              description: pixel.description || "",
            });
            break;
          case "GOOGLE_ADS":
            setGoogleAdsData({
              config: pixel.config as GoogleAdsConfig,
              enabled: pixel.enabled,
              testMode: pixel.testMode,
              description: pixel.description || "",
            });
            break;
          case "GOOGLE_ANALYTICS":
            setGoogleAnalyticsData({
              config: pixel.config as GoogleAnalyticsConfig,
              enabled: pixel.enabled,
              testMode: pixel.testMode,
              description: pixel.description || "",
            });
            break;
        }
      });
    }

    setLoading(false);
  };

  const handleSave = async (platform: PixelPlatform) => {
    setSaving(platform);

    let config, enabled, testMode, description;

    switch (platform) {
      case "FACEBOOK":
        config = facebookData.config;
        enabled = facebookData.enabled;
        testMode = facebookData.testMode;
        description = facebookData.description;
        break;
      case "TIKTOK":
        config = tiktokData.config;
        enabled = tiktokData.enabled;
        testMode = tiktokData.testMode;
        description = tiktokData.description;
        break;
      case "GOOGLE_ADS":
        config = googleAdsData.config;
        enabled = googleAdsData.enabled;
        testMode = googleAdsData.testMode;
        description = googleAdsData.description;
        break;
      case "GOOGLE_ANALYTICS":
        config = googleAnalyticsData.config;
        enabled = googleAnalyticsData.enabled;
        testMode = googleAnalyticsData.testMode;
        description = googleAnalyticsData.description;
        break;
      default:
        return;
    }

    const result = await savePixel(platform, config, enabled, testMode, description);

    if (result.success) {
      toast.success(`Configuración de ${platform} guardada exitosamente`);
    } else {
      toast.error(result.error || "Error al guardar configuración");
    }

    setSaving(null);
  };

  const handleDelete = async (platform: PixelPlatform) => {
    if (!confirm(`¿Seguro que deseas eliminar la configuración de ${platform}?`)) {
      return;
    }

    const result = await deletePixel(platform);

    if (result.success) {
      toast.success(`Configuración de ${platform} eliminada`);
      loadPixels();
    } else {
      toast.error(result.error || "Error al eliminar configuración");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProtectedRoute permission="settings:edit_tracking">
      <div className="space-y-6 p-4 sm:p-0">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Píxeles de Seguimiento</h1>
          <p className="text-muted-foreground mt-1">
            Configura píxeles de Facebook, TikTok, Google Ads y Google Analytics
          </p>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>💡 ¿Para qué sirven los píxeles?</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Rastrear conversiones (compras, registros, etc.)</li>
              <li>Optimizar campañas publicitarias automáticamente</li>
              <li>Crear audiencias de remarketing</li>
              <li>Medir el ROI de tus anuncios</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs defaultValue="facebook" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="facebook" className="flex items-center gap-2">
              <Facebook className="h-4 w-4" />
              <span className="hidden sm:inline">Facebook</span>
            </TabsTrigger>
            <TabsTrigger value="tiktok" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">TikTok</span>
            </TabsTrigger>
            <TabsTrigger value="google-ads" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Google Ads</span>
            </TabsTrigger>
            <TabsTrigger value="google-analytics" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">GA4</span>
            </TabsTrigger>
          </TabsList>

          {/* FACEBOOK PIXEL */}
          <TabsContent value="facebook" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Facebook className="h-5 w-5 text-blue-600" />
                      Meta Pixel (Facebook)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Configura el píxel de Meta y su Conversion API
                    </CardDescription>
                  </div>
                  {facebookData.enabled && (
                    <Badge className="bg-green-500">
                      Activo
                      {facebookData.testMode && " (Test)"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enabled */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="fb-enabled">Habilitar Facebook Pixel</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa el píxel en tu sitio
                    </p>
                  </div>
                  <Switch
                    id="fb-enabled"
                    checked={facebookData.enabled}
                    onCheckedChange={(checked) =>
                      setFacebookData({ ...facebookData, enabled: checked })
                    }
                  />
                </div>

                {/* Test Mode */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="fb-test">Modo de Prueba</Label>
                    <p className="text-sm text-muted-foreground">
                      Los eventos se marcarán como de prueba
                    </p>
                  </div>
                  <Switch
                    id="fb-test"
                    checked={facebookData.testMode}
                    onCheckedChange={(checked) =>
                      setFacebookData({ ...facebookData, testMode: checked })
                    }
                  />
                </div>

                {/* Pixel ID */}
                <div className="space-y-2">
                  <Label htmlFor="fb-pixel-id">
                    Pixel ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fb-pixel-id"
                    value={facebookData.config.pixelId}
                    onChange={(e) =>
                      setFacebookData({
                        ...facebookData,
                        config: { ...facebookData.config, pixelId: e.target.value },
                      })
                    }
                    placeholder="123456789012345"
                    disabled={!facebookData.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de 15 dígitos de tu píxel de Meta
                  </p>
                </div>

                {/* Access Token */}
                <div className="space-y-2">
                  <Label htmlFor="fb-token">
                    Access Token (Conversion API)
                  </Label>
                  <div className="relative">
                    <Input
                      id="fb-token"
                      type={showTokens.facebook ? "text" : "password"}
                      value={facebookData.config.accessToken || ""}
                      onChange={(e) =>
                        setFacebookData({
                          ...facebookData,
                          config: { ...facebookData.config, accessToken: e.target.value },
                        })
                      }
                      placeholder="EAAxxxxxxxxxx..."
                      disabled={!facebookData.enabled}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowTokens({ ...showTokens, facebook: !showTokens.facebook })
                      }
                    >
                      {showTokens.facebook ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Token para enviar eventos server-side (API de Conversiones)
                  </p>
                </div>

                {/* Test Event Code */}
                <div className="space-y-2">
                  <Label htmlFor="fb-test-code">Test Event Code (Opcional)</Label>
                  <Input
                    id="fb-test-code"
                    value={facebookData.config.testEventCode || ""}
                    onChange={(e) =>
                      setFacebookData({
                        ...facebookData,
                        config: { ...facebookData.config, testEventCode: e.target.value },
                      })
                    }
                    placeholder="TEST12345"
                    disabled={!facebookData.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Código para probar eventos en el Event Manager
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="fb-desc">Notas/Descripción</Label>
                  <Textarea
                    id="fb-desc"
                    value={facebookData.description}
                    onChange={(e) =>
                      setFacebookData({ ...facebookData, description: e.target.value })
                    }
                    placeholder="ej: Píxel de campaña Q1 2025"
                    rows={2}
                  />
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleSave("FACEBOOK")}
                    disabled={saving === "FACEBOOK"}
                    className="flex-1"
                  >
                    {saving === "FACEBOOK" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete("FACEBOOK")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Documentación */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>📖 Cómo obtener tus credenciales:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                  <li>Ve a <a href="https://business.facebook.com/events_manager2" target="_blank" className="text-blue-600 hover:underline">Events Manager</a></li>
                  <li>Selecciona tu píxel y copia el Pixel ID</li>
                  <li>Para Conversion API: Settings → Generate Access Token</li>
                  <li>Para pruebas: Test Events → Get Test Event Code</li>
                </ol>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* TIKTOK PIXEL */}
          <TabsContent value="tiktok" className="space-y-6">
            {/* Similar structure to Facebook, but with TikTok specific fields */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      TikTok Pixel
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Configura el píxel de TikTok y su Events API
                    </CardDescription>
                  </div>
                  {tiktokData.enabled && (
                    <Badge className="bg-green-500">
                      Activo
                      {tiktokData.testMode && " (Test)"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enabled */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="tt-enabled">Habilitar TikTok Pixel</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa el píxel en tu sitio
                    </p>
                  </div>
                  <Switch
                    id="tt-enabled"
                    checked={tiktokData.enabled}
                    onCheckedChange={(checked) =>
                      setTiktokData({ ...tiktokData, enabled: checked })
                    }
                  />
                </div>

                {/* Test Mode */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="tt-test">Modo de Prueba</Label>
                    <p className="text-sm text-muted-foreground">
                      Los eventos se marcarán como de prueba
                    </p>
                  </div>
                  <Switch
                    id="tt-test"
                    checked={tiktokData.testMode}
                    onCheckedChange={(checked) =>
                      setTiktokData({ ...tiktokData, testMode: checked })
                    }
                  />
                </div>

                {/* Pixel ID */}
                <div className="space-y-2">
                  <Label htmlFor="tt-pixel-id">
                    Pixel ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tt-pixel-id"
                    value={tiktokData.config.pixelId}
                    onChange={(e) =>
                      setTiktokData({
                        ...tiktokData,
                        config: { ...tiktokData.config, pixelId: e.target.value },
                      })
                    }
                    placeholder="C4XXXXXXXXXXXXXXXXX"
                    disabled={!tiktokData.enabled}
                  />
                </div>

                {/* Access Token */}
                <div className="space-y-2">
                  <Label htmlFor="tt-token">
                    Access Token (Events API)
                  </Label>
                  <div className="relative">
                    <Input
                      id="tt-token"
                      type={showTokens.tiktok ? "text" : "password"}
                      value={tiktokData.config.accessToken || ""}
                      onChange={(e) =>
                        setTiktokData({
                          ...tiktokData,
                          config: { ...tiktokData.config, accessToken: e.target.value },
                        })
                      }
                      placeholder="xxxxxxxxxx..."
                      disabled={!tiktokData.enabled}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowTokens({ ...showTokens, tiktok: !showTokens.tiktok })
                      }
                    >
                      {showTokens.tiktok ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Token para enviar eventos server-side
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="tt-desc">Notas/Descripción</Label>
                  <Textarea
                    id="tt-desc"
                    value={tiktokData.description}
                    onChange={(e) =>
                      setTiktokData({ ...tiktokData, description: e.target.value })
                    }
                    placeholder="ej: Píxel de TikTok Ads"
                    rows={2}
                  />
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleSave("TIKTOK")}
                    disabled={saving === "TIKTOK"}
                    className="flex-1"
                  >
                    {saving === "TIKTOK" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete("TIKTOK")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Documentación */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>📖 Cómo obtener tus credenciales:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                  <li>Ve a <a href="https://ads.tiktok.com/i18n/events_manager" target="_blank" className="text-blue-600 hover:underline">TikTok Events Manager</a></li>
                  <li>Selecciona tu píxel y copia el Pixel Code</li>
                  <li>Para Events API: Settings → Generate Access Token</li>
                </ol>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* GOOGLE ADS */}
          <TabsContent value="google-ads" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                      Google Ads Conversion Tracking
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Rastrea conversiones de Google Ads
                    </CardDescription>
                  </div>
                  {googleAdsData.enabled && (
                    <Badge className="bg-green-500">Activo</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enabled */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="ga-enabled">Habilitar Google Ads</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa el seguimiento de conversiones
                    </p>
                  </div>
                  <Switch
                    id="ga-enabled"
                    checked={googleAdsData.enabled}
                    onCheckedChange={(checked) =>
                      setGoogleAdsData({ ...googleAdsData, enabled: checked })
                    }
                  />
                </div>

                {/* Conversion ID */}
                <div className="space-y-2">
                  <Label htmlFor="ga-conv-id">
                    Conversion ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ga-conv-id"
                    value={googleAdsData.config.conversionId}
                    onChange={(e) =>
                      setGoogleAdsData({
                        ...googleAdsData,
                        config: { ...googleAdsData.config, conversionId: e.target.value },
                      })
                    }
                    placeholder="AW-123456789"
                    disabled={!googleAdsData.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID de conversión (ej: AW-123456789)
                  </p>
                </div>

                {/* Conversion Label */}
                <div className="space-y-2">
                  <Label htmlFor="ga-conv-label">Conversion Label</Label>
                  <Input
                    id="ga-conv-label"
                    value={googleAdsData.config.conversionLabel || ""}
                    onChange={(e) =>
                      setGoogleAdsData({
                        ...googleAdsData,
                        config: { ...googleAdsData.config, conversionLabel: e.target.value },
                      })
                    }
                    placeholder="abcDEfGhIjKlMnOpQ"
                    disabled={!googleAdsData.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Label específico de la conversión de compra
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="ga-desc">Notas/Descripción</Label>
                  <Textarea
                    id="ga-desc"
                    value={googleAdsData.description}
                    onChange={(e) =>
                      setGoogleAdsData({ ...googleAdsData, description: e.target.value })
                    }
                    placeholder="ej: Conversión de compra principal"
                    rows={2}
                  />
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleSave("GOOGLE_ADS")}
                    disabled={saving === "GOOGLE_ADS"}
                    className="flex-1"
                  >
                    {saving === "GOOGLE_ADS" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete("GOOGLE_ADS")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Documentación */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>📖 Cómo obtener tus credenciales:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                  <li>Ve a Google Ads → Herramientas → Conversiones</li>
                  <li>Crea o selecciona una conversión de "Compra"</li>
                  <li>Copia el Conversion ID (AW-XXXXXXXXX)</li>
                  <li>Copia el Conversion Label de la etiqueta global</li>
                </ol>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* GOOGLE ANALYTICS 4 */}
          <TabsContent value="google-analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5 text-orange-600" />
                      Google Analytics 4 (GA4)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Analytics y medición avanzada con GA4
                    </CardDescription>
                  </div>
                  {googleAnalyticsData.enabled && (
                    <Badge className="bg-green-500">Activo</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enabled */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label htmlFor="ga4-enabled">Habilitar Google Analytics 4</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa GA4 en tu sitio
                    </p>
                  </div>
                  <Switch
                    id="ga4-enabled"
                    checked={googleAnalyticsData.enabled}
                    onCheckedChange={(checked) =>
                      setGoogleAnalyticsData({ ...googleAnalyticsData, enabled: checked })
                    }
                  />
                </div>

                {/* Measurement ID */}
                <div className="space-y-2">
                  <Label htmlFor="ga4-measurement-id">
                    Measurement ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ga4-measurement-id"
                    value={googleAnalyticsData.config.measurementId}
                    onChange={(e) =>
                      setGoogleAnalyticsData({
                        ...googleAnalyticsData,
                        config: { ...googleAnalyticsData.config, measurementId: e.target.value },
                      })
                    }
                    placeholder="G-XXXXXXXXXX"
                    disabled={!googleAnalyticsData.enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID de medición de GA4 (G-XXXXXXXXXX)
                  </p>
                </div>

                {/* API Secret */}
                <div className="space-y-2">
                  <Label htmlFor="ga4-api-secret">
                    API Secret (Measurement Protocol)
                  </Label>
                  <div className="relative">
                    <Input
                      id="ga4-api-secret"
                      type={showTokens.googleAnalytics ? "text" : "password"}
                      value={googleAnalyticsData.config.apiSecret || ""}
                      onChange={(e) =>
                        setGoogleAnalyticsData({
                          ...googleAnalyticsData,
                          config: { ...googleAnalyticsData.config, apiSecret: e.target.value },
                        })
                      }
                      placeholder="xxxxxxxxxxxxxxxxxxxx"
                      disabled={!googleAnalyticsData.enabled}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowTokens({
                          ...showTokens,
                          googleAnalytics: !showTokens.googleAnalytics,
                        })
                      }
                    >
                      {showTokens.googleAnalytics ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Secret para enviar eventos server-side (Measurement Protocol API)
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="ga4-desc">Notas/Descripción</Label>
                  <Textarea
                    id="ga4-desc"
                    value={googleAnalyticsData.description}
                    onChange={(e) =>
                      setGoogleAnalyticsData({
                        ...googleAnalyticsData,
                        description: e.target.value,
                      })
                    }
                    placeholder="ej: Property principal de GA4"
                    rows={2}
                  />
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleSave("GOOGLE_ANALYTICS")}
                    disabled={saving === "GOOGLE_ANALYTICS"}
                    className="flex-1"
                  >
                    {saving === "GOOGLE_ANALYTICS" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete("GOOGLE_ANALYTICS")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Documentación */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>📖 Cómo obtener tus credenciales:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 ml-2">
                  <li>Ve a <a href="https://analytics.google.com" target="_blank" className="text-blue-600 hover:underline">Google Analytics</a></li>
                  <li>Selecciona tu propiedad → Admin → Flujos de datos</li>
                  <li>Copia el Measurement ID (G-XXXXXXXXXX)</li>
                  <li>Para API: Admin → Flujos de datos → Measurement Protocol API secrets</li>
                </ol>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}