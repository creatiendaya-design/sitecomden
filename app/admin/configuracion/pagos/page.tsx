"use client";

import { useState, useEffect } from "react";
import {
  getPaymentMethodSettings,
  savePaymentMethodSettings,
  uploadQRImage,
  type PaymentMethodSettings,
} from "@/actions/payment-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Upload, CheckCircle2, AlertCircle, Smartphone } from "lucide-react";
import Image from "next/image";

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentMethodSettings>({
    yape: {
      enabled: true,
      phoneNumber: "",
      qrImageUrl: "",
      accountName: "",
    },
    plin: {
      enabled: true,
      phoneNumber: "",
      qrImageUrl: "",
      accountName: "",
    },
  });

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"yape" | "plin" | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar configuración al montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingSettings(true);
    const loadedSettings = await getPaymentMethodSettings();
    setSettings(loadedSettings);
    setLoadingSettings(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await savePaymentMethodSettings(settings);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || "Error al guardar");
    }

    setSaving(false);
  };

  const handleQRUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    method: "yape" | "plin"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(method);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("method", method);

    const result = await uploadQRImage(formData);

    if (result.success && result.url) {
      setSettings((prev) => ({
        ...prev,
        [method]: {
          ...prev[method],
          qrImageUrl: result.url,
        },
      }));
    } else {
      setError(result.error || "Error al subir imagen");
    }

    setUploading(null);
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
        <h1 className="text-3xl font-bold">Configuración de Pagos</h1>
        <p className="text-muted-foreground">
          Configura los métodos de pago Yape y Plin
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

      {/* YAPE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Yape
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Habilitar/Deshabilitar */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="yape-enabled">Habilitar Yape</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar Yape como opción de pago
              </p>
            </div>
            <Switch
              id="yape-enabled"
              checked={settings.yape.enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  yape: { ...prev.yape, enabled: checked },
                }))
              }
            />
          </div>

          <Separator />

          {/* Número de teléfono */}
          <div className="space-y-2">
            <Label htmlFor="yape-phone">Número de Teléfono</Label>
            <Input
              id="yape-phone"
              type="text"
              placeholder="987654321"
              value={settings.yape.phoneNumber}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  yape: { ...prev.yape, phoneNumber: e.target.value },
                }))
              }
              disabled={!settings.yape.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Número asociado a tu cuenta de Yape
            </p>
          </div>

          {/* Nombre de cuenta */}
          <div className="space-y-2">
            <Label htmlFor="yape-account">Nombre de la Cuenta</Label>
            <Input
              id="yape-account"
              type="text"
              placeholder="Tu Tienda Perú"
              value={settings.yape.accountName}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  yape: { ...prev.yape, accountName: e.target.value },
                }))
              }
              disabled={!settings.yape.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Nombre que aparece en tu cuenta de Yape
            </p>
          </div>

          {/* QR Image */}
          <div className="space-y-2">
            <Label>Código QR de Yape</Label>

            {settings.yape.qrImageUrl ? (
              <div className="space-y-2">
                <div className="relative w-64 h-64 rounded-lg border-2 overflow-hidden">
                  <Image
                    src={settings.yape.qrImageUrl}
                    alt="QR Yape"
                    fill
                    className="object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      yape: { ...prev.yape, qrImageUrl: "" },
                    }))
                  }
                  disabled={!settings.yape.enabled}
                >
                  Quitar QR
                </Button>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="yape-qr-upload"
                  className="flex flex-col items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center">
                    {uploading === "yape" ? (
                      <Loader2 className="h-10 w-10 text-gray-400 animate-spin mb-3" />
                    ) : (
                      <Upload className="h-10 w-10 text-gray-400 mb-3" />
                    )}
                    <p className="text-sm text-gray-500">
                      {uploading === "yape"
                        ? "Subiendo..."
                        : "Click para subir QR"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG (MAX. 2MB)
                    </p>
                  </div>
                  <input
                    id="yape-qr-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleQRUpload(e, "yape")}
                    disabled={!settings.yape.enabled || uploading === "yape"}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  El código QR de tu cuenta de Yape
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PLIN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Plin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Habilitar/Deshabilitar */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="plin-enabled">Habilitar Plin</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar Plin como opción de pago
              </p>
            </div>
            <Switch
              id="plin-enabled"
              checked={settings.plin.enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  plin: { ...prev.plin, enabled: checked },
                }))
              }
            />
          </div>

          <Separator />

          {/* Número de teléfono */}
          <div className="space-y-2">
            <Label htmlFor="plin-phone">Número de Teléfono</Label>
            <Input
              id="plin-phone"
              type="text"
              placeholder="987654321"
              value={settings.plin.phoneNumber}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  plin: { ...prev.plin, phoneNumber: e.target.value },
                }))
              }
              disabled={!settings.plin.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Número asociado a tu cuenta de Plin
            </p>
          </div>

          {/* Nombre de cuenta */}
          <div className="space-y-2">
            <Label htmlFor="plin-account">Nombre de la Cuenta</Label>
            <Input
              id="plin-account"
              type="text"
              placeholder="Tu Tienda Perú"
              value={settings.plin.accountName}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  plin: { ...prev.plin, accountName: e.target.value },
                }))
              }
              disabled={!settings.plin.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Nombre que aparece en tu cuenta de Plin
            </p>
          </div>

          {/* QR Image */}
          <div className="space-y-2">
            <Label>Código QR de Plin</Label>

            {settings.plin.qrImageUrl ? (
              <div className="space-y-2">
                <div className="relative w-64 h-64 rounded-lg border-2 overflow-hidden">
                  <Image
                    src={settings.plin.qrImageUrl}
                    alt="QR Plin"
                    fill
                    className="object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      plin: { ...prev.plin, qrImageUrl: "" },
                    }))
                  }
                  disabled={!settings.plin.enabled}
                >
                  Quitar QR
                </Button>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="plin-qr-upload"
                  className="flex flex-col items-center justify-center w-64 h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center">
                    {uploading === "plin" ? (
                      <Loader2 className="h-10 w-10 text-gray-400 animate-spin mb-3" />
                    ) : (
                      <Upload className="h-10 w-10 text-gray-400 mb-3" />
                    )}
                    <p className="text-sm text-gray-500">
                      {uploading === "plin"
                        ? "Subiendo..."
                        : "Click para subir QR"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG (MAX. 2MB)
                    </p>
                  </div>
                  <input
                    id="plin-qr-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleQRUpload(e, "plin")}
                    disabled={!settings.plin.enabled || uploading === "plin"}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  El código QR de tu cuenta de Plin
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
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