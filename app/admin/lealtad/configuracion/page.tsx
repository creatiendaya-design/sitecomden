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
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No se pudo cargar la configuración</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0 pb-24 sm:pb-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Configuración del Programa</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ajusta los parámetros del programa de lealtad y referidos
          </p>
        </div>
        <Button variant="outline" asChild size="icon" className="h-9 w-9 sm:hidden shrink-0">
          <Link href="/admin/lealtad" aria-label="Volver">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild className="hidden sm:inline-flex">
          <Link href="/admin/lealtad">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      {/* Estado del Programa */}
      <Card className="border-2">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Estado del Programa
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Label htmlFor="enabled" className="text-sm sm:text-base font-medium">
                Programa de Lealtad
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {settings.enabled
                  ? "Activo. Los clientes pueden ganar y canjear puntos."
                  : "Desactivado temporalmente."}
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enabled: checked })
              }
              className="shrink-0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversión de Puntos */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            Conversión de Puntos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Define cómo se ganan y gastan los puntos
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="pointsPerSol" className="text-xs sm:text-sm">
                Puntos por Sol
              </Label>
              <Input
                id="pointsPerSol"
                type="number"
                value={settings.pointsPerSol}
                onChange={(e) =>
                  setSettings({ ...settings, pointsPerSol: e.target.value })
                }
                className="mt-1 h-9"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                1 = 1 pt por S/. 1
              </p>
            </div>

            <div>
              <Label htmlFor="solsPerPoint" className="text-xs sm:text-sm">
                Soles por Punto
              </Label>
              <Input
                id="solsPerPoint"
                type="number"
                step="0.01"
                value={settings.solsPerPoint}
                onChange={(e) =>
                  setSettings({ ...settings, solsPerPoint: e.target.value })
                }
                className="mt-1 h-9"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                0.10 = 1 pt = S/. 0.10
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs sm:text-sm font-medium text-blue-900">
              Ejemplo de Conversión:
            </p>
            <p className="text-xs sm:text-sm text-blue-800 mt-1 tabular-nums">
              S/. 100 → {settings.pointsPerSol * 100} puntos
            </p>
            <p className="text-xs sm:text-sm text-blue-800 tabular-nums">
              100 puntos → S/. {(settings.solsPerPoint * 100).toFixed(2)} descuento
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bonos */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
            Bonos de Puntos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Puntos otorgados en eventos especiales
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="welcomeBonus" className="text-xs sm:text-sm">
                Bienvenida
              </Label>
              <Input
                id="welcomeBonus"
                type="number"
                value={settings.welcomeBonus}
                onChange={(e) =>
                  setSettings({ ...settings, welcomeBonus: e.target.value })
                }
                className="mt-1 h-9"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Al registrarse
              </p>
            </div>

            <div>
              <Label htmlFor="birthdayBonus" className="text-xs sm:text-sm">
                Cumpleaños
              </Label>
              <Input
                id="birthdayBonus"
                type="number"
                value={settings.birthdayBonus}
                onChange={(e) =>
                  setSettings({ ...settings, birthdayBonus: e.target.value })
                }
                className="mt-1 h-9"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                En su cumpleaños
              </p>
            </div>

            <div>
              <Label htmlFor="referralBonus" className="text-xs sm:text-sm">
                Por Referir
              </Label>
              <Input
                id="referralBonus"
                type="number"
                value={settings.referralBonus}
                onChange={(e) =>
                  setSettings({ ...settings, referralBonus: e.target.value })
                }
                className="mt-1 h-9"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Quien refiere
              </p>
            </div>

            <div>
              <Label htmlFor="referredBonus" className="text-xs sm:text-sm">
                Al ser Referido
              </Label>
              <Input
                id="referredBonus"
                type="number"
                value={settings.referredBonus}
                onChange={(e) =>
                  setSettings({ ...settings, referredBonus: e.target.value })
                }
                className="mt-1 h-9"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                Quien es referido
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Niveles VIP */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
            Niveles VIP
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Puntos necesarios y descuentos por nivel
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {/* Bronce */}
            <div className="flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl sm:text-3xl shrink-0">🥉</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base">Bronce</p>
                <p className="text-[11px] sm:text-sm text-muted-foreground tabular-nums">
                  0 puntos · Sin beneficios extra
                </p>
              </div>
            </div>

            {/* Plata */}
            <TierEditor
              emoji="🥈"
              name="Plata"
              bgClass="bg-gray-50 border-gray-200"
              thresholdId="silverThreshold"
              thresholdValue={settings.silverThreshold}
              discountId="silverDiscount"
              discountValue={settings.silverDiscount}
              onThresholdChange={(v) => setSettings({ ...settings, silverThreshold: v })}
              onDiscountChange={(v) => setSettings({ ...settings, silverDiscount: v })}
            />

            {/* Oro */}
            <TierEditor
              emoji="🥇"
              name="Oro"
              bgClass="bg-yellow-50 border-yellow-200"
              thresholdId="goldThreshold"
              thresholdValue={settings.goldThreshold}
              discountId="goldDiscount"
              discountValue={settings.goldDiscount}
              onThresholdChange={(v) => setSettings({ ...settings, goldThreshold: v })}
              onDiscountChange={(v) => setSettings({ ...settings, goldDiscount: v })}
            />

            {/* Platino */}
            <TierEditor
              emoji="💎"
              name="Platino"
              bgClass="bg-purple-50 border-purple-200"
              thresholdId="platinumThreshold"
              thresholdValue={settings.platinumThreshold}
              discountId="platinumDiscount"
              discountValue={settings.platinumDiscount}
              onThresholdChange={(v) => setSettings({ ...settings, platinumThreshold: v })}
              onDiscountChange={(v) => setSettings({ ...settings, platinumDiscount: v })}
            />

            <div className="flex items-center justify-between gap-2 p-2.5 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Label htmlFor="platinumFreeShipping" className="text-xs sm:text-sm font-medium">
                Platino incluye envío gratis
              </Label>
              <Switch
                id="platinumFreeShipping"
                checked={settings.platinumFreeShipping}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, platinumFreeShipping: checked })
                }
                className="shrink-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiración */}
      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            Expiración de Puntos
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Define cuándo expiran los puntos no utilizados
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div>
            <Label htmlFor="pointsExpireDays" className="text-xs sm:text-sm">
              Días hasta expiración
            </Label>
            <Input
              id="pointsExpireDays"
              type="number"
              value={settings.pointsExpireDays}
              onChange={(e) =>
                setSettings({ ...settings, pointsExpireDays: e.target.value })
              }
              className="mt-1 h-9"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Los puntos expirarán después de {settings.pointsExpireDays} días desde
              que fueron ganados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vista Previa */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Vista Previa del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-2 sm:space-y-3">
          <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">Gasta S/. 100</span>
            <span className="font-bold tabular-nums">
              {settings.pointsPerSol * 100} pts
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">Se registra</span>
            <span className="font-bold tabular-nums">
              {settings.welcomeBonus} pts
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">Refiere a alguien</span>
            <span className="font-bold tabular-nums">
              {settings.referralBonus} pts
            </span>
          </div>
          <Separator />
          <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground truncate">
              Nivel Oro ({settings.goldThreshold}+ pts)
            </span>
            <span className="font-bold tabular-nums">
              {settings.goldDiscount}% off
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Acciones desktop */}
      <div className="hidden sm:flex justify-end gap-2">
        <Button variant="outline" onClick={loadSettings} disabled={saving}>
          Descartar Cambios
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>

      {/* Sticky bottom save bar — mobile only */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur px-3 py-2.5 flex gap-2 shadow-lg">
        <Button
          type="button"
          variant="outline"
          onClick={loadSettings}
          disabled={saving}
          className="flex-1 h-10"
        >
          Descartar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 h-10">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

// Sub-component: editor para cada nivel VIP (excepto Bronce)
function TierEditor({
  emoji,
  name,
  bgClass,
  thresholdId,
  thresholdValue,
  discountId,
  discountValue,
  onThresholdChange,
  onDiscountChange,
}: {
  emoji: string;
  name: string;
  bgClass: string;
  thresholdId: string;
  thresholdValue: string | number;
  discountId: string;
  discountValue: string | number;
  onThresholdChange: (v: string) => void;
  onDiscountChange: (v: string) => void;
}) {
  return (
    <div className={`p-2.5 sm:p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className="text-2xl sm:text-3xl shrink-0">{emoji}</div>
        <p className="font-semibold text-sm sm:text-base flex-1">{name}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4">
        <div>
          <Label htmlFor={thresholdId} className="text-[11px] sm:text-sm text-muted-foreground">
            Puntos mínimos
          </Label>
          <Input
            id={thresholdId}
            type="number"
            value={thresholdValue}
            onChange={(e) => onThresholdChange(e.target.value)}
            className="mt-0.5 h-9"
          />
        </div>
        <div>
          <Label htmlFor={discountId} className="text-[11px] sm:text-sm text-muted-foreground">
            Descuento (%)
          </Label>
          <Input
            id={discountId}
            type="number"
            value={discountValue}
            onChange={(e) => onDiscountChange(e.target.value)}
            className="mt-0.5 h-9"
          />
        </div>
      </div>
    </div>
  );
}