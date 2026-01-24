"use client";

import { useState, useEffect } from "react";
import {
  getEmailSettings,
  saveEmailSettings,
  type EmailSettings,
} from "@/actions/email-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, CheckCircle2, AlertCircle, Mail, Building2 } from "lucide-react";
import ProtectedRoute from "@/components/admin/ProtectedRoute"; // ← CORRECTO

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>({
    fromEmail: "",
    fromName: "",
    replyToEmail: "",
    adminEmail: "",
    companyName: "",
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración al montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    const loadedSettings = await getEmailSettings();
    setSettings(loadedSettings);
    setLoadingSettings(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await saveEmailSettings(settings);

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
    <ProtectedRoute permission="settings:configure">
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Configuración de Emails</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configura los emails que se usan en el sistema
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

        {/* Información General */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Información de la Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            {/* Nombre de la Empresa */}
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm sm:text-base">
                Nombre de la Empresa
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Mi Tienda Perú"
                value={settings.companyName}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    companyName: e.target.value,
                  }))
                }
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Nombre que aparece en los emails y en el footer
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Envío */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              Emails de Envío
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            {/* Nombre del Remitente */}
            <div className="space-y-2">
              <Label htmlFor="fromName" className="text-sm sm:text-base">
                Nombre del Remitente
              </Label>
              <Input
                id="fromName"
                type="text"
                placeholder="Tienda Perú"
                value={settings.fromName}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    fromName: e.target.value,
                  }))
                }
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Nombre que verá el cliente cuando reciba un email
              </p>
            </div>

            {/* Email de Envío */}
            <div className="space-y-2">
              <Label htmlFor="fromEmail" className="text-sm sm:text-base">
                Email de Envío
              </Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="pedidos@mitienda.com"
                value={settings.fromEmail}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    fromEmail: e.target.value,
                  }))
                }
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Email desde el cual se envían los correos (debe estar verificado en Resend)
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-lg border bg-slate-50 p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-medium mb-2">Vista previa:</p>
              <p className="text-xs sm:text-sm text-muted-foreground break-all">
                De: <strong>{settings.fromName || "Nombre"}</strong> &lt;
                {settings.fromEmail || "email@ejemplo.com"}&gt;
              </p>
            </div>

            <Separator />

            {/* Email de Respuesta */}
            <div className="space-y-2">
              <Label htmlFor="replyToEmail" className="text-sm sm:text-base">
                Email de Respuesta (Reply-To)
              </Label>
              <Input
                id="replyToEmail"
                type="email"
                placeholder="soporte@mitienda.com"
                value={settings.replyToEmail}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    replyToEmail: e.target.value,
                  }))
                }
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Email al que se enviarán las respuestas de los clientes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email de Administrador */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              Email de Administrador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
            {/* Email Admin */}
            <div className="space-y-2">
              <Label htmlFor="adminEmail" className="text-sm sm:text-base">
                Email del Administrador
              </Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@mitienda.com"
                value={settings.adminEmail}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    adminEmail: e.target.value,
                  }))
                }
                className="text-sm sm:text-base"
              />
              <p className="text-xs text-muted-foreground">
                Email donde se recibirán notificaciones importantes (nuevas órdenes,
                pagos pendientes, etc)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información Importante */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>Importante:</strong> El email de envío debe estar verificado en
            Resend. Si usas <code className="text-xs">onboarding@resend.dev</code> solo podrás enviar
            emails a tu propia cuenta de Resend (útil para testing).
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
    </ProtectedRoute>
  );
}