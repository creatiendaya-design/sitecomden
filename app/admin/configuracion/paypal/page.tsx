"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPaypalSettings,
  savePaypalSettings,
  type PaypalSettings,
} from "@/actions/paypal-settings";
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
  Globe,
} from "lucide-react";
import ProtectedRoute from "@/components/admin/ProtectedRoute";

const EMPTY_SETTINGS: PaypalSettings = {
  mode: "sandbox",
  sandbox: { clientId: "", clientSecret: "" },
  live: { clientId: "", clientSecret: "" },
  currency: "USD",
  exchangeRate: 0,
  webhookId: "",
};

export default function PaypalSettingsPage() {
  const [settings, setSettings] = useState<PaypalSettings>(EMPTY_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSandboxSecret, setShowSandboxSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const loaded = await getPaypalSettings();
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

    const result = await savePaypalSettings(settings);

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
          <h1 className="text-2xl sm:text-3xl font-bold">Configuración de PayPal</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestiona las credenciales de PayPal, la divisa de cobro y el modo de operación
          </p>
        </div>

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

        {/* Modo */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
              Modo de Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {settings.mode === "sandbox" ? (
                    <TestTube className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Rocket className="h-5 w-5 text-green-500" />
                  )}
                  <Label htmlFor="pp-mode-toggle" className="text-sm sm:text-base font-medium">
                    {settings.mode === "sandbox" ? "Modo Sandbox" : "Modo Producción (Live)"}
                  </Label>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {settings.mode === "sandbox"
                    ? "Usando credenciales sandbox - Los pagos no son reales"
                    : "Usando credenciales live - ¡Los pagos son reales!"}
                </p>
              </div>
              <Switch
                id="pp-mode-toggle"
                checked={settings.mode === "live"}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, mode: checked ? "live" : "sandbox" }))
                }
              />
            </div>

            {settings.mode === "live" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>⚠️ Modo Producción Activo:</strong> Los pagos procesados serán reales.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Divisa + tipo de cambio */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
              Divisa y Tipo de Cambio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                PayPal no acepta soles (PEN). El total de la orden se convierte a la divisa
                seleccionada usando el tipo de cambio que definas aquí.
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pp-currency" className="text-sm sm:text-base">
                  Divisa de cobro
                </Label>
                <Input
                  id="pp-currency"
                  type="text"
                  placeholder="USD"
                  maxLength={3}
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))
                  }
                  className="text-sm sm:text-base font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">Código ISO de 3 letras (ej. USD)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pp-rate" className="text-sm sm:text-base">
                  Tipo de cambio (soles por 1 {settings.currency || "USD"})
                </Label>
                <Input
                  id="pp-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="3.80"
                  value={settings.exchangeRate || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, exchangeRate: Number(e.target.value) }))
                  }
                  className="text-sm sm:text-base font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Ej: 3.80 significa S/ 3.80 = 1 {settings.currency || "USD"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credenciales Sandbox */}
        <Card className={settings.mode === "sandbox" ? "border-yellow-500" : ""}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <TestTube className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              Credenciales Sandbox
              {settings.mode === "sandbox" && (
                <span className="text-xs sm:text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                  Activo
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="sandbox-client-id" className="text-sm sm:text-base">
                Client ID (Sandbox)
              </Label>
              <Input
                id="sandbox-client-id"
                type="text"
                placeholder="Axxx...."
                value={settings.sandbox.clientId}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    sandbox: { ...prev.sandbox, clientId: e.target.value },
                  }))
                }
                className="text-sm sm:text-base font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sandbox-secret" className="text-sm sm:text-base">
                Client Secret (Sandbox)
              </Label>
              <div className="relative">
                <Input
                  id="sandbox-secret"
                  type={showSandboxSecret ? "text" : "password"}
                  placeholder="EXxxx..."
                  value={settings.sandbox.clientSecret}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      sandbox: { ...prev.sandbox, clientSecret: e.target.value },
                    }))
                  }
                  className="text-sm sm:text-base font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSandboxSecret(!showSandboxSecret)}
                >
                  {showSandboxSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credenciales Live */}
        <Card className={settings.mode === "live" ? "border-green-500" : ""}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              Credenciales de Producción (Live)
              {settings.mode === "live" && (
                <span className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  Activo
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="live-client-id" className="text-sm sm:text-base">
                Client ID (Live)
              </Label>
              <Input
                id="live-client-id"
                type="text"
                placeholder="AxxxX...."
                value={settings.live.clientId}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    live: { ...prev.live, clientId: e.target.value },
                  }))
                }
                className="text-sm sm:text-base font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="live-secret" className="text-sm sm:text-base">
                Client Secret (Live)
              </Label>
              <div className="relative">
                <Input
                  id="live-secret"
                  type={showLiveSecret ? "text" : "password"}
                  placeholder="EXxxx..."
                  value={settings.live.clientSecret}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      live: { ...prev.live, clientSecret: e.target.value },
                    }))
                  }
                  className="text-sm sm:text-base font-mono pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowLiveSecret(!showLiveSecret)}
                >
                  {showLiveSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {settings.mode === "live" && (
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

        {/* Webhook ID */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
              Webhook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="pp-webhook-id" className="text-sm sm:text-base">
                Webhook ID <span className="text-muted-foreground">(recomendado)</span>
              </Label>
              <Input
                id="pp-webhook-id"
                type="text"
                placeholder="WH-..."
                value={settings.webhookId}
                onChange={(e) => setSettings((prev) => ({ ...prev, webhookId: e.target.value }))}
                className="text-sm sm:text-base font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Crea un webhook en PayPal apuntando a{" "}
                <code className="bg-muted px-1 rounded">/api/webhooks/paypal</code> y pega su ID
                aquí para validar la firma de las notificaciones.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm space-y-2">
            <p>
              <strong>📌 Obtén tus credenciales de PayPal:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>
                Entra a{" "}
                <a
                  href="https://developer.paypal.com/dashboard/applications"
                  target="_blank"
                  rel="noopener"
                  className="text-blue-600 hover:underline"
                >
                  developer.paypal.com/dashboard
                </a>
              </li>
              <li>
                Crea/abre una App → copia <strong>Client ID</strong> y <strong>Secret</strong>{" "}
                (Sandbox y/o Live)
              </li>
              <li>
                En <strong>Webhooks</strong>, crea uno apuntando a{" "}
                <code className="bg-muted px-1 rounded">/api/webhooks/paypal</code> y copia su ID
              </li>
              <li>Pega todo aquí y guarda los cambios</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 Recuerda habilitar “PayPal” en{" "}
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
