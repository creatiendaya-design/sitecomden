"use client";

import { useState, useEffect } from "react";
import {
  getPaymentMethodSettings,
  savePaymentMethodSettings,
  uploadQRImage,
  type PaymentMethodSettings,
} from "@/actions/payment-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Save, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone,
  CreditCard,
  Banknote
} from "lucide-react";
import Image from "next/image";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import { 
  YapeIcon, 
  PlinIcon, 
  VisaIcon, 
  MastercardIcon, 
  PayPalIcon,
  MercadoPagoIcon 
} from "@/components/payment-icons";

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
    card: {
      enabled: true,
      description: "",
    },
    paypal: {
      enabled: false,
      description: "",
    },
    mercadopago: {
      enabled: false,
      description: "",
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
    <ProtectedRoute permission="settings:edit_payments">
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Métodos de Pago</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Habilita y configura los métodos de pago disponibles en tu tienda
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
              Configuración guardada correctamente. Los cambios se reflejarán en el checkout.
            </AlertDescription>
          </Alert>
        )}

        {/* Resumen de Métodos Habilitados */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Banknote className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Métodos Habilitados en Checkout</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.yape.enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs">
                      <YapeIcon width={16} height={16} /> Yape
                    </span>
                  )}
                  {settings.plin.enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs">
                      <PlinIcon width={16} height={16} /> Plin
                    </span>
                  )}
                  {settings.card.enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs">
                      <CreditCard className="h-3 w-3" /> Tarjetas
                    </span>
                  )}
                  {settings.paypal.enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs">
                      <PayPalIcon width={16} height={10} /> PayPal
                    </span>
                  )}
                  {settings.mercadopago.enabled && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded text-xs">
                      Mercado Pago
                    </span>
                  )}
                  {!settings.yape.enabled && !settings.plin.enabled && !settings.card.enabled && 
                   !settings.paypal.enabled && !settings.mercadopago.enabled && (
                    <span className="text-xs text-blue-700">
                      ⚠️ No hay métodos habilitados. Los clientes no podrán completar compras.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* YAPE */}
        <Card className={settings.yape.enabled ? "border-primary" : "opacity-60"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <YapeIcon width={32} height={32} />
                <div>
                  <CardTitle>Yape</CardTitle>
                  <CardDescription>Transferencia instantánea • 0% comisión</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.yape.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    yape: { ...prev.yape, enabled: checked },
                  }))
                }
              />
            </div>
          </CardHeader>
          
          {settings.yape.enabled && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  />
                </div>

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
                  />
                </div>
              </div>

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
                    >
                      Quitar QR
                    </Button>
                  </div>
                ) : (
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
                        {uploading === "yape" ? "Subiendo..." : "Click para subir QR"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG (MAX. 2MB)</p>
                    </div>
                    <input
                      id="yape-qr-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleQRUpload(e, "yape")}
                      disabled={uploading === "yape"}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* PLIN */}
        <Card className={settings.plin.enabled ? "border-primary" : "opacity-60"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PlinIcon width={32} height={32} />
                <div>
                  <CardTitle>Plin</CardTitle>
                  <CardDescription>Transferencia instantánea • 0% comisión</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.plin.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    plin: { ...prev.plin, enabled: checked },
                  }))
                }
              />
            </div>
          </CardHeader>
          
          {settings.plin.enabled && (
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  />
                </div>

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
                  />
                </div>
              </div>

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
                    >
                      Quitar QR
                    </Button>
                  </div>
                ) : (
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
                        {uploading === "plin" ? "Subiendo..." : "Click para subir QR"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG (MAX. 2MB)</p>
                    </div>
                    <input
                      id="plin-qr-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleQRUpload(e, "plin")}
                      disabled={uploading === "plin"}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* TARJETAS (CULQI) */}
        <Card className={settings.card.enabled ? "border-primary" : "opacity-60"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <VisaIcon width={40} height={26} />
                  <MastercardIcon width={32} height={20} />
                </div>
                <div>
                  <CardTitle>Tarjetas de Crédito/Débito</CardTitle>
                  <CardDescription>Procesado por Culqi • ~3.5% + S/0.30</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.card.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    card: { ...prev.card, enabled: checked },
                  }))
                }
              />
            </div>
          </CardHeader>
          
          {settings.card.enabled && (
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  Las claves de Culqi se configuran en{" "}
                  <a href="/admin/configuracion/culqi" className="underline font-medium">
                    Configuración → Culqi
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="card-description">Descripción (opcional)</Label>
                <Textarea
                  id="card-description"
                  placeholder="Acepta Visa, Mastercard, American Express..."
                  value={settings.card.description}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      card: { ...prev.card, description: e.target.value },
                    }))
                  }
                  rows={2}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* PAYPAL */}
        <Card className={settings.paypal.enabled ? "border-primary" : "opacity-60"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PayPalIcon width={36} height={22} />
                <div>
                  <CardTitle>PayPal</CardTitle>
                  <CardDescription>Pagos internacionales • ~5% comisión</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.paypal.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    paypal: { ...prev.paypal, enabled: checked },
                  }))
                }
              />
            </div>
          </CardHeader>
          
          {settings.paypal.enabled && (
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>En desarrollo:</strong> La integración con PayPal estará disponible próximamente.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="paypal-description">Descripción (opcional)</Label>
                <Textarea
                  id="paypal-description"
                  placeholder="Acepta pagos internacionales con PayPal..."
                  value={settings.paypal.description}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      paypal: { ...prev.paypal, description: e.target.value },
                    }))
                  }
                  rows={2}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* MERCADO PAGO */}
        <Card className={settings.mercadopago.enabled ? "border-primary" : "opacity-60"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-blue-100">
                  <Banknote className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Mercado Pago</CardTitle>
                  <CardDescription>Alternativa LATAM • ~4% comisión</CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.mercadopago.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    mercadopago: { ...prev.mercadopago, enabled: checked },
                  }))
                }
              />
            </div>
          </CardHeader>
          
          {settings.mercadopago.enabled && (
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>En desarrollo:</strong> La integración con Mercado Pago estará disponible próximamente.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="mp-description">Descripción (opcional)</Label>
                <Textarea
                  id="mp-description"
                  placeholder="Acepta pagos con Mercado Pago..."
                  value={settings.mercadopago.description}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      mercadopago: { ...prev.mercadopago, description: e.target.value },
                    }))
                  }
                  rows={2}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 sticky bottom-4 bg-background/95 backdrop-blur pt-4 pb-2 border-t">
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