"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getMercadoPagoSettings,
  saveMercadoPagoSettings,
  type MercadoPagoSettings,
} from "@/actions/mercadopago-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

const EMPTY_SETTINGS: MercadoPagoSettings = {
  mode: "test",
  test: { accessToken: "", publicKey: "" },
  production: { accessToken: "", publicKey: "" },
  webhookSecret: "",
};

export default function MercadoPagoSettingsPage() {
  const [settings, setSettings] = useState<MercadoPagoSettings>(EMPTY_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showTestToken, setShowTestToken] = useState(false);
  const [showProdToken, setShowProdToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const loaded = await getMercadoPagoSettings();
    setSettings(loaded ?? EMPTY_SETTINGS);
    setLoadingSettings(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings(); // data fetch on mount; setState is async inside loadSettings
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await saveMercadoPagoSettings(settings);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || "Error al guardar");
    }

    setSaving(false);
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProtectedRoute permission="settings:edit_payments">
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configuración de Mercado Pago</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestiona las credenciales de Mercado Pago (Checkout Pro) y el modo de operación
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-green-700">
              Configuración guardada correctamente
            </AlertDescription>
          </Alert>
        )}

        {/* Modo de Operación */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              Modo de Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {settings.mode === "test" ? (
                    <TestTube className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Rocket className="h-5 w-5 text-green-500" />
                  )}
                  <Label htmlFor="mp-mode-toggle" className="text-sm sm:text-base font-medium">
                    {settings.mode === "test" ? "Modo Prueba" : "Modo Producción"}
                  </Label>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {settings.mode === "test"
                    ? "Usando credenciales de prueba - Los pagos no son reales"
                    : "Usando credenciales de producción - ¡Los pagos son reales!"}
                </p>
              </div>
              <Switch
                id="mp-mode-toggle"
                checked={settings.mode === "production"}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    mode: checked ? "production" : "test",
                  }))
                }
              />
            </div>

            {settings.mode === "production" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>⚠️ Modo Producción Activo:</strong> Los pagos procesados serán reales.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Credenciales de Prueba */}
        <Card className={settings.mode === "test" ? "border-yellow-500" : ""}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <TestTube className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              Credenciales de Prueba
              {settings.mode === "test" && (
                <span className="text-xs sm:text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                  Activo
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="test-access-token" className="text-sm sm:text-base">
                Access Token (Test)
              </Label>
              <div className="relative">
                <Input
                  id="test-access-token"
                  type={showTestToken ? "text" : "password"}
                  placeholder="TEST-..."
                  value={settings.test.accessToken}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      test: { ...prev.test, accessToken: e.target.value },
                    }))
                  }
                  className="text-sm sm:text-base font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowTestToken(!showTestToken)}
                >
                  {showTestToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token secreto del backend (nunca exponerlo al público)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-public-key" className="text-sm sm:text-base">
                Public Key (Test) <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="test-public-key"
                type="text"
                placeholder="TEST-..."
                value={settings.test.publicKey}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    test: { ...prev.test, publicKey: e.target.value },
                  }))
                }
                className="text-sm sm:text-base font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Credenciales de Producción */}
        <Card className={settings.mode === "production" ? "border-green-500" : ""}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              Credenciales de Producción
              {settings.mode === "production" && (
                <span className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Activo
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="prod-access-token" className="text-sm sm:text-base">
                Access Token (Production)
              </Label>
              <div className="relative">
                <Input
                  id="prod-access-token"
                  type={showProdToken ? "text" : "password"}
                  placeholder="APP_USR-..."
                  value={settings.production.accessToken}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      production: { ...prev.production, accessToken: e.target.value },
                    }))
                  }
                  className="text-sm sm:text-base font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowProdToken(!showProdToken)}
                >
                  {showProdToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Token secreto del backend (nunca exponerlo al público)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-public-key" className="text-sm sm:text-base">
                Public Key (Production) <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="prod-public-key"
                type="text"
                placeholder="APP_USR-..."
                value={settings.production.publicKey}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    production: { ...prev.production, publicKey: e.target.value },
                  }))
                }
                className="text-sm sm:text-base font-mono"
              />
            </div>

            {settings.mode === "production" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  ⚠️ <strong>Importante:</strong> Verifica que estas credenciales sean correctas
                  antes de procesar pagos reales.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Webhook Secret */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              Clave Secreta del Webhook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="webhook-secret" className="text-sm sm:text-base">
                Webhook Secret <span className="text-muted-foreground">(recomendado)</span>
              </Label>
              <div className="relative">
                <Input
                  id="webhook-secret"
                  type={showWebhookSecret ? "text" : "password"}
                  placeholder="Clave secreta del webhook"
                  value={settings.webhookSecret}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, webhookSecret: e.target.value }))
                  }
                  className="text-sm sm:text-base font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                >
                  {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Valida la firma de cada notificación. Si lo dejas vacío, el webhook se procesa
                igual (verificando el pago contra la API), pero sin chequeo de firma.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información Importante */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm space-y-2">
            <p>
              <strong>📌 Obtén tus credenciales de Mercado Pago:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Inicia sesión en{" "}
                <a
                  href="https://www.mercadopago.com.pe/developers/panel"
                  target="_blank"
                  rel="noopener"
                  className="text-blue-600 hover:underline"
                >
                  mercadopago.com.pe/developers/panel
                </a>
              </li>
              <li>
                Crea/abre tu aplicación → <strong>Credenciales</strong> (prueba y producción)
              </li>
              <li>
                Configura el <strong>Webhook</strong> apuntando a{" "}
                <code className="bg-muted px-1 rounded">/api/webhooks/mercadopago</code> y copia su
                clave secreta
              </li>
              <li>Pega las credenciales aquí y guarda los cambios</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 Recuerda habilitar “Mercado Pago” en{" "}
              <strong>Configuración → Métodos de Pago</strong> para que aparezca en el checkout.
            </p>
          </AlertDescription>
        </Alert>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={loadSettings}
            disabled={saving}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Guardando...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Guardar Cambios</span>
                <span className="sm:hidden">Guardar</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
