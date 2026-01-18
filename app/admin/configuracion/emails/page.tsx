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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuración de Emails</h1>
        <p className="text-muted-foreground">
          Configura los emails que se usan en el sistema
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Configuración guardada correctamente
          </AlertDescription>
        </Alert>
      )}

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información de la Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre de la Empresa */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Nombre de la Empresa</Label>
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
            />
            <p className="text-xs text-muted-foreground">
              Nombre que aparece en los emails y en el footer
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Envío */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails de Envío
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nombre del Remitente */}
          <div className="space-y-2">
            <Label htmlFor="fromName">Nombre del Remitente</Label>
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
            />
            <p className="text-xs text-muted-foreground">
              Nombre que verá el cliente cuando reciba un email
            </p>
          </div>

          {/* Email de Envío */}
          <div className="space-y-2">
            <Label htmlFor="fromEmail">Email de Envío</Label>
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
            />
            <p className="text-xs text-muted-foreground">
              Email desde el cual se envían los correos (debe estar verificado en Resend)
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm font-medium mb-2">Vista previa:</p>
            <p className="text-sm text-muted-foreground">
              De: <strong>{settings.fromName || "Nombre"}</strong> &lt;
              {settings.fromEmail || "email@ejemplo.com"}&gt;
            </p>
          </div>

          <Separator />

          {/* Email de Respuesta */}
          <div className="space-y-2">
            <Label htmlFor="replyToEmail">Email de Respuesta (Reply-To)</Label>
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
            />
            <p className="text-xs text-muted-foreground">
              Email al que se enviarán las respuestas de los clientes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email de Administrador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email de Administrador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Admin */}
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email del Administrador</Label>
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
        <AlertDescription>
          <strong>Importante:</strong> El email de envío debe estar verificado en
          Resend. Si usas <code>onboarding@resend.dev</code> solo podrás enviar
          emails a tu propia cuenta de Resend (útil para testing).
        </AlertDescription>
      </Alert>

      {/* Botones */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadSettings} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}