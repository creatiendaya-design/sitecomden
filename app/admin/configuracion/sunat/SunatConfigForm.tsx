"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { saveSunatConfigAction, testSunatConnectionAction } from "@/actions/sunat";
import { useRouter } from "next/navigation";

interface SunatConfigFormProps {
  initialConfig: {
    enabled: boolean;
    emissionMode: string;
    apiKeyMasked: string;
    apiUrl: string;
    ruc: string;
    razonSocial: string;
    address: string;
    boletaSeries: string;
    facturaSeries: string;
    pricesIncludeIgv: boolean;
  };
}

export default function SunatConfigForm({ initialConfig }: SunatConfigFormProps) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const key = apiKey || config.apiKeyMasked;
      const result = await testSunatConnectionAction(key, config.apiUrl);
      setTestResult({ ok: result.success, msg: result.error ?? "Conexión exitosa" });
    } catch {
      setTestResult({ ok: false, msg: "Error al conectar. Intenta nuevamente." });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveSunatConfigAction({
        enabled: config.enabled,
        emissionMode: config.emissionMode as "auto" | "manual" | "mixed",
        apiKey: apiKey || config.apiKeyMasked,
        apiUrl: config.apiUrl,
        ruc: config.ruc,
        razonSocial: config.razonSocial,
        address: config.address,
        boletaSeries: config.boletaSeries,
        facturaSeries: config.facturaSeries,
        pricesIncludeIgv: config.pricesIncludeIgv,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch {
      setTestResult({ ok: false, msg: "Error al guardar. Intenta nuevamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Facturación Electrónica SUNAT</h1>
        <p className="text-muted-foreground mt-1">
          Configura la emisión de boletas y facturas electrónicas via Nubefact
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Activación</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
          />
          <span className="text-sm">
            {config.enabled ? "Facturación electrónica activada" : "Facturación electrónica desactivada"}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Modo de Emisión</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup
            value={config.emissionMode}
            onValueChange={(v) => setConfig({ ...config, emissionMode: v })}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="auto" id="mode-auto" />
              <Label htmlFor="mode-auto">Automático — se emite al confirmar el pago</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="manual" id="mode-manual" />
              <Label htmlFor="mode-manual">Manual — el admin emite desde el panel</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="mixed" id="mode-mixed" />
              <Label htmlFor="mode-mixed">Mixto — boletas automáticas, facturas manuales</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Credenciales Nubefact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-24">Ambiente</Label>
            <RadioGroup
              value={config.apiUrl.includes("demo") ? "sandbox" : "production"}
              onValueChange={(v) =>
                setConfig({
                  ...config,
                  apiUrl:
                    v === "sandbox"
                      ? "https://demo-ose.nubefact.com/ose/api"
                      : "https://ose.nubefact.com/ose/api",
                })
              }
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sandbox" id="env-sandbox" />
                <Label htmlFor="env-sandbox">Sandbox (pruebas)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="production" id="env-prod" />
                <Label htmlFor="env-prod">Producción</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder={config.apiKeyMasked ? "••••••••••••• (guardada)" : "Ingresa tu API Key de Nubefact"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? "Probando..." : "Probar conexión"}
            </Button>
            {testResult && (
              <Badge variant={testResult.ok ? "default" : "destructive"}>
                {testResult.msg}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Datos del Emisor</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              { key: "ruc" as const, label: "RUC", placeholder: "20123456789" },
              { key: "razonSocial" as const, label: "Razón Social", placeholder: "Mi Tienda SAC" },
              { key: "address" as const, label: "Dirección Fiscal", placeholder: "Av. Lima 123, Lima" },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                placeholder={placeholder}
                value={config[key]}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Series</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Serie Boletas</Label>
            <Input
              value={config.boletaSeries}
              onChange={(e) => setConfig({ ...config, boletaSeries: e.target.value })}
            />
          </div>
          <div>
            <Label>Serie Facturas</Label>
            <Input
              value={config.facturaSeries}
              onChange={(e) => setConfig({ ...config, facturaSeries: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Precios</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            checked={config.pricesIncludeIgv}
            onCheckedChange={(v) => setConfig({ ...config, pricesIncludeIgv: v })}
          />
          <span className="text-sm">
            Los precios de los productos ya incluyen IGV (18%)
          </span>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
      </Button>
    </div>
  );
}
