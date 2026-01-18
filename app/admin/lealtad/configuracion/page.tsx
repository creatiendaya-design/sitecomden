"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  ChevronLeft, 
  Save, 
  Trophy,
  Gift,
  Users,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getLoyaltySettings, updateLoyaltySettings } from "@/actions/loyalty";
import { toast } from "sonner";

export default function ConfiguracionLealtadPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await getLoyaltySettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
      toast.error("Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateLoyaltySettings({
        pointsPerSol: parseInt(settings.pointsPerSol),
        solsPerPoint: parseFloat(settings.solsPerPoint),
        welcomeBonus: parseInt(settings.welcomeBonus),
        referralBonus: parseInt(settings.referralBonus),
        referredBonus: parseInt(settings.referredBonus),
        birthdayBonus: parseInt(settings.birthdayBonus),
        silverThreshold: parseInt(settings.silverThreshold),
        goldThreshold: parseInt(settings.goldThreshold),
        platinumThreshold: parseInt(settings.platinumThreshold),
        silverDiscount: parseInt(settings.silverDiscount),
        goldDiscount: parseInt(settings.goldDiscount),
        platinumDiscount: parseInt(settings.platinumDiscount),
        platinumFreeShipping: settings.platinumFreeShipping,
        pointsExpireDays: parseInt(settings.pointsExpireDays),
        enabled: settings.enabled,
      });

      if (result.success) {
        toast.success("Configuración guardada exitosamente");
        loadSettings();
      } else {
        toast.error(result.error || "Error al guardar");
      }
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se pudo cargar la configuración</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Configuración del Programa</h1>
          <p className="text-muted-foreground">
            Ajusta los parámetros del programa de lealtad y referidos
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/lealtad">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      {/* Estado del Programa */}
      <Card className="mb-6 border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Estado del Programa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="text-base font-medium">
                Programa de Lealtad
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.enabled 
                  ? "El programa está activo y los clientes pueden ganar y canjear puntos" 
                  : "El programa está desactivado temporalmente"}
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversión de Puntos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Conversión de Puntos
          </CardTitle>
          <CardDescription>
            Define cómo se ganan y gastan los puntos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pointsPerSol">Puntos por Sol Gastado</Label>
              <Input
                id="pointsPerSol"
                type="number"
                value={settings.pointsPerSol}
                onChange={(e) => 
                  setSettings({ ...settings, pointsPerSol: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ejemplo: 1 = 1 punto por cada S/. 1
              </p>
            </div>

            <div>
              <Label htmlFor="solsPerPoint">Soles por Punto</Label>
              <Input
                id="solsPerPoint"
                type="number"
                step="0.01"
                value={settings.solsPerPoint}
                onChange={(e) => 
                  setSettings({ ...settings, solsPerPoint: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ejemplo: 0.10 = 1 punto = S/. 0.10
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900">Ejemplo de Conversión:</p>
            <p className="text-sm text-blue-800 mt-1">
              Cliente compra S/. 100 → Gana {settings.pointsPerSol * 100} puntos
            </p>
            <p className="text-sm text-blue-800">
              Cliente canjea 100 puntos → Descuento de S/. {(settings.solsPerPoint * 100).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bonos */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Bonos de Puntos
          </CardTitle>
          <CardDescription>
            Puntos otorgados en eventos especiales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="welcomeBonus">Bono de Bienvenida</Label>
              <Input
                id="welcomeBonus"
                type="number"
                value={settings.welcomeBonus}
                onChange={(e) => 
                  setSettings({ ...settings, welcomeBonus: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Al registrarse en el programa
              </p>
            </div>

            <div>
              <Label htmlFor="birthdayBonus">Bono de Cumpleaños</Label>
              <Input
                id="birthdayBonus"
                type="number"
                value={settings.birthdayBonus}
                onChange={(e) => 
                  setSettings({ ...settings, birthdayBonus: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                En su día de cumpleaños
              </p>
            </div>

            <div>
              <Label htmlFor="referralBonus">Bono por Referir</Label>
              <Input
                id="referralBonus"
                type="number"
                value={settings.referralBonus}
                onChange={(e) => 
                  setSettings({ ...settings, referralBonus: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quien refiere a alguien
              </p>
            </div>

            <div>
              <Label htmlFor="referredBonus">Bono al ser Referido</Label>
              <Input
                id="referredBonus"
                type="number"
                value={settings.referredBonus}
                onChange={(e) => 
                  setSettings({ ...settings, referredBonus: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quien es referido por alguien
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Niveles VIP */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Niveles VIP (Umbrales)
          </CardTitle>
          <CardDescription>
            Puntos necesarios para alcanzar cada nivel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {/* Bronce */}
            <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-3xl">🥉</div>
              <div className="flex-1">
                <p className="font-semibold">Bronce</p>
                <p className="text-sm text-muted-foreground">0 puntos</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Sin beneficios extra</p>
              </div>
            </div>

            {/* Plata */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-3xl">🥈</div>
              <div className="flex-1">
                <Label htmlFor="silverThreshold">Plata</Label>
                <Input
                  id="silverThreshold"
                  type="number"
                  value={settings.silverThreshold}
                  onChange={(e) => 
                    setSettings({ ...settings, silverThreshold: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="w-40">
                <Label htmlFor="silverDiscount">Descuento (%)</Label>
                <Input
                  id="silverDiscount"
                  type="number"
                  value={settings.silverDiscount}
                  onChange={(e) => 
                    setSettings({ ...settings, silverDiscount: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Oro */}
            <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-3xl">🥇</div>
              <div className="flex-1">
                <Label htmlFor="goldThreshold">Oro</Label>
                <Input
                  id="goldThreshold"
                  type="number"
                  value={settings.goldThreshold}
                  onChange={(e) => 
                    setSettings({ ...settings, goldThreshold: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="w-40">
                <Label htmlFor="goldDiscount">Descuento (%)</Label>
                <Input
                  id="goldDiscount"
                  type="number"
                  value={settings.goldDiscount}
                  onChange={(e) => 
                    setSettings({ ...settings, goldDiscount: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Platino */}
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-3xl">💎</div>
              <div className="flex-1">
                <Label htmlFor="platinumThreshold">Platino</Label>
                <Input
                  id="platinumThreshold"
                  type="number"
                  value={settings.platinumThreshold}
                  onChange={(e) => 
                    setSettings({ ...settings, platinumThreshold: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="w-40">
                <Label htmlFor="platinumDiscount">Descuento (%)</Label>
                <Input
                  id="platinumDiscount"
                  type="number"
                  value={settings.platinumDiscount}
                  onChange={(e) => 
                    setSettings({ ...settings, platinumDiscount: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Switch
                id="platinumFreeShipping"
                checked={settings.platinumFreeShipping}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, platinumFreeShipping: checked })
                }
              />
              <Label htmlFor="platinumFreeShipping">
                Nivel Platino incluye envío gratis
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiración */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Expiración de Puntos
          </CardTitle>
          <CardDescription>
            Define cuándo expiran los puntos no utilizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="pointsExpireDays">Días hasta expiración</Label>
            <Input
              id="pointsExpireDays"
              type="number"
              value={settings.pointsExpireDays}
              onChange={(e) => 
                setSettings({ ...settings, pointsExpireDays: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Los puntos expirarán después de {settings.pointsExpireDays} días desde que fueron ganados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vista Previa */}
      <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle>Vista Previa del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Cliente gasta S/. 100</span>
            <span className="font-bold">→ Gana {settings.pointsPerSol * 100} puntos</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm">Cliente se registra</span>
            <span className="font-bold">→ Bono de {settings.welcomeBonus} puntos</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm">Cliente refiere a alguien</span>
            <span className="font-bold">→ Gana {settings.referralBonus} puntos</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-sm">Cliente nivel Oro ({settings.goldThreshold}+ pts)</span>
            <span className="font-bold">→ {settings.goldDiscount}% descuento</span>
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={loadSettings}
          disabled={saving}
        >
          Descartar Cambios
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}