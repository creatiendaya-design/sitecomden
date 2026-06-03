"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { updateReviewRequestConfig } from "@/actions/review-settings";
import type { ReviewRequestConfig } from "@/lib/reviews/request-config";

interface Props {
  initialConfig: ReviewRequestConfig;
}

export default function ReviewRequestSettingsForm({ initialConfig }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [config, setConfig] = useState<ReviewRequestConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateReviewRequestConfig(config);
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
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin/resenas">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a reseñas
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Activación y tiempo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Enviar email post-compra</Label>
              <p className="text-xs text-muted-foreground">
                Si está desactivado, el cron no enviará ningún correo.
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig({ ...config, enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="days">Días después de la entrega</Label>
            <Input
              id="days"
              type="number"
              min={0}
              max={365}
              value={config.daysAfterDelivery}
              onChange={(e) =>
                setConfig({
                  ...config,
                  daysAfterDelivery: Number(e.target.value),
                })
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              El correo se envía cuando el pedido lleva este número de días en
              estado “Entregado”.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Contenido del email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto</Label>
            <Input
              id="subject"
              value={config.subject}
              onChange={(e) =>
                setConfig({ ...config, subject: e.target.value })
              }
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              value={config.message}
              onChange={(e) =>
                setConfig({ ...config, message: e.target.value })
              }
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              Debajo de este texto se listan automáticamente los productos
              comprados con un enlace a cada uno.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buttonText">Texto del botón</Label>
            <Input
              id="buttonText"
              value={config.buttonText}
              onChange={(e) =>
                setConfig({ ...config, buttonText: e.target.value })
              }
              maxLength={60}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4 md:pt-6">
          <p className="text-xs md:text-sm text-blue-900">
            💡 <strong>Programación:</strong> el envío lo dispara una llamada
            diaria a <code>/api/internal/review-requests</code> (con el header{" "}
            <code>Authorization: Bearer &lt;CRON_SECRET&gt;</code>). Configúralo
            en tu servicio de cron (p. ej. cron-job.org) una vez al día.
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
