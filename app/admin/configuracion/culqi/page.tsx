"use client";

import { useState, useEffect } from "react";
import {
  getCulqiSettings,
  saveCulqiSettings,
  type CulqiSettings,
} from "@/actions/culqi-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard,
  Eye,
  EyeOff,
  TestTube,
  Rocket
} from "lucide-react";

export default function CulqiSettingsPage() {
  const [settings, setSettings] = useState<CulqiSettings>({
    mode: "test",
    test: {
      publicKey: "",
      secretKey: "",
    },
    production: {
      publicKey: "",
      secretKey: "",
    },
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Control de visibilidad de claves
  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showProdSecret, setShowProdSecret] = useState(false);

  // Cargar configuración al montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    const loadedSettings = await getCulqiSettings();
    setSettings(loadedSettings);
    setLoadingSettings(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await saveCulqiSettings(settings);

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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configuración de Culqi</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Gestiona las claves API de Culqi y el modo de operación
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
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
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
                <Label htmlFor="mode-toggle" className="text-sm sm:text-base font-medium">
                  {settings.mode === "test" ? "Modo Prueba" : "Modo Producción"}
                </Label>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {settings.mode === "test" 
                  ? "Usando claves de prueba - Los pagos no son reales"
                  : "Usando claves de producción - ¡Los pagos son reales!"
                }
              </p>
            </div>
            <Switch
              id="mode-toggle"
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
                <strong>⚠️ Modo Producción Activo:</strong> Los pagos procesados serán reales 
                y se realizarán cargos a las tarjetas de los clientes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Claves de Prueba */}
      <Card className={settings.mode === "test" ? "border-yellow-500" : ""}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <TestTube className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            Claves de Prueba
            {settings.mode === "test" && (
              <span className="text-xs sm:text-sm bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                Activo
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          {/* Public Key de Prueba */}
          <div className="space-y-2">
            <Label htmlFor="test-public-key" className="text-sm sm:text-base">
              Public Key (Test)
            </Label>
            <Input
              id="test-public-key"
              type="text"
              placeholder="pk_test_..."
              value={settings.test.publicKey}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  test: { ...prev.test, publicKey: e.target.value },
                }))
              }
              className="text-sm sm:text-base font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Clave pública para el frontend (visible en el navegador)
            </p>
          </div>

          {/* Secret Key de Prueba */}
          <div className="space-y-2">
            <Label htmlFor="test-secret-key" className="text-sm sm:text-base">
              Secret Key (Test)
            </Label>
            <div className="relative">
              <Input
                id="test-secret-key"
                type={showTestSecret ? "text" : "password"}
                placeholder="sk_test_..."
                value={settings.test.secretKey}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    test: { ...prev.test, secretKey: e.target.value },
                  }))
                }
                className="text-sm sm:text-base font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowTestSecret(!showTestSecret)}
              >
                {showTestSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clave secreta para el backend (nunca exponerla al público)
            </p>
          </div>

          {/* Info de Tarjetas de Prueba */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              <strong>Tarjetas de prueba:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Éxito: <code className="text-xs">4111 1111 1111 1111</code></li>
                <li>Rechazo: <code className="text-xs">4000 0000 0000 0002</code></li>
                <li>CVV: <code className="text-xs">123</code> | Fecha: <code className="text-xs">12/28</code></li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Claves de Producción */}
      <Card className={settings.mode === "production" ? "border-green-500" : ""}>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            Claves de Producción
            {settings.mode === "production" && (
              <span className="text-xs sm:text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded">
                Activo
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          {/* Public Key de Producción */}
          <div className="space-y-2">
            <Label htmlFor="prod-public-key" className="text-sm sm:text-base">
              Public Key (Production)
            </Label>
            <Input
              id="prod-public-key"
              type="text"
              placeholder="pk_live_..."
              value={settings.production.publicKey}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  production: { ...prev.production, publicKey: e.target.value },
                }))
              }
              className="text-sm sm:text-base font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Clave pública para el frontend (visible en el navegador)
            </p>
          </div>

          {/* Secret Key de Producción */}
          <div className="space-y-2">
            <Label htmlFor="prod-secret-key" className="text-sm sm:text-base">
              Secret Key (Production)
            </Label>
            <div className="relative">
              <Input
                id="prod-secret-key"
                type={showProdSecret ? "text" : "password"}
                placeholder="sk_live_..."
                value={settings.production.secretKey}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    production: { ...prev.production, secretKey: e.target.value },
                  }))
                }
                className="text-sm sm:text-base font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowProdSecret(!showProdSecret)}
              >
                {showProdSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clave secreta para el backend (nunca exponerla al público)
            </p>
          </div>

          {settings.mode === "production" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                ⚠️ <strong>Importante:</strong> Verifica que estas claves sean correctas antes 
                de procesar pagos reales. Un error podría resultar en transacciones fallidas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Información Importante */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm space-y-2">
          <p>
            <strong>📌 Obtén tus claves de Culqi:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Inicia sesión en <a href="https://integ-panel.culqi.com" target="_blank" rel="noopener" className="text-blue-600 hover:underline">panel.culqi.com</a></li>
            <li>Ve a <strong>Desarrollo → API Keys</strong></li>
            <li>Copia tus claves de prueba y/o producción</li>
            <li>Pega las claves aquí y guarda los cambios</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            💡 Las claves se guardan encriptadas en la base de datos y nunca se exponen al público.
          </p>
        </AlertDescription>
      </Alert>

      {/* Botones - Responsive */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2">
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
  );
}