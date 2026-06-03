"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import { updateReviewRewardConfig } from "@/actions/review-reward-settings";
import type {
  ReviewRewardConfig,
  ReviewRewardCouponType,
} from "@/lib/reviews/reward-config";

interface Props {
  initialConfig: ReviewRewardConfig;
}

export default function ReviewRewardSettingsForm({ initialConfig }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [config, setConfig] = useState<ReviewRewardConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  const isPercentage = config.couponType === "PERCENTAGE";

  const handleSave = async () => {
    setSaving(true);
    const result = await updateReviewRewardConfig(config);
    if (result.success) {
      toast({ title: "Configuración guardada" });
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo guardar",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Cupón de recompensa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Activar cupón por reseña</Label>
              <p className="text-xs text-muted-foreground">
                Solo se entrega a reseñas de <strong>compra verificada</strong>{" "}
                y al momento de aprobarlas. Un cupón por reseña.
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enabled: checked })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de descuento</Label>
              <Select
                value={config.couponType}
                onValueChange={(v) =>
                  setConfig({
                    ...config,
                    couponType: v as ReviewRewardCouponType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Monto fijo (S/)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                {isPercentage ? "Porcentaje (%)" : "Monto (S/)"}
              </Label>
              <Input
                id="value"
                type="number"
                min={1}
                max={isPercentage ? 100 : undefined}
                step={isPercentage ? 1 : 0.5}
                value={config.value}
                onChange={(e) =>
                  setConfig({ ...config, value: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minPurchase">Compra mínima (S/)</Label>
              <Input
                id="minPurchase"
                type="number"
                min={0}
                step={0.5}
                value={config.minPurchase}
                onChange={(e) =>
                  setConfig({ ...config, minPurchase: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                0 = sin mínimo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Validez (días)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min={1}
                max={365}
                value={config.expiresInDays}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    expiresInDays: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-4 md:pt-6">
          <p className="text-xs md:text-sm text-amber-900">
            ⚠️ <strong>Antifraude:</strong> el cupón solo se genera para reseñas
            de compra verificada (el email coincide con un pedido pagado que
            incluye el producto). Las reseñas sin compra verificada no generan
            cupón aunque las apruebes.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
