"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getComplaintsConfig,
  updateComplaintsConfig,
} from "@/actions/complaints";

export default function ComplaintsConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    prefix: "REC",
    emailSubject: "Reclamación Recibida",
    emailMessage:
      "Hemos recibido su reclamación y será atendida a la brevedad.",
    successMessage:
      "Su reclamación ha sido registrada exitosamente. Recibirá un email de confirmación.",
    requireEmail: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const result = await getComplaintsConfig();

    if (result.success) {
      setConfig({
        prefix: result.data.prefix || "REC",
        emailSubject: result.data.emailSubject || "Reclamación Recibida",
        emailMessage:
          result.data.emailMessage ||
          "Hemos recibido su reclamación y será atendida a la brevedad.",
        successMessage:
          result.data.successMessage ||
          "Su reclamación ha sido registrada exitosamente. Recibirá un email de confirmación.",
        requireEmail: result.data.requireEmail !== false,
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateComplaintsConfig(config);

    if (result.success) {
      toast({
        title: "Configuración guardada",
        description: "Los cambios se aplicaron correctamente",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Error al guardar configuración",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-muted-foreground">
          Personaliza los emails y mensajes del sistema
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Numeración */}
        <Card>
          <CardHeader>
            <CardTitle>Numeración de Reclamaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefijo</Label>
              <Input
                id="prefix"
                value={config.prefix}
                onChange={(e) =>
                  setConfig({ ...config, prefix: e.target.value })
                }
                placeholder="REC"
                maxLength={10}
              />
              <p className="text-sm text-muted-foreground">
                Ejemplo: {config.prefix}-2025-001, {config.prefix}-2025-002
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email de Confirmación */}
        <Card>
          <CardHeader>
            <CardTitle>Email de Confirmación al Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailSubject">Asunto del Email</Label>
              <Input
                id="emailSubject"
                value={config.emailSubject}
                onChange={(e) =>
                  setConfig({ ...config, emailSubject: e.target.value })
                }
                placeholder="Reclamación Recibida"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailMessage">Mensaje del Email</Label>
              <Textarea
                id="emailMessage"
                value={config.emailMessage}
                onChange={(e) =>
                  setConfig({ ...config, emailMessage: e.target.value })
                }
                placeholder="Hemos recibido su reclamación..."
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Este mensaje aparecerá en el email de confirmación que recibe el
                cliente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mensaje de Éxito */}
        <Card>
          <CardHeader>
            <CardTitle>Mensaje de Éxito en el Sitio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="successMessage">Mensaje de Éxito</Label>
              <Textarea
                id="successMessage"
                value={config.successMessage}
                onChange={(e) =>
                  setConfig({ ...config, successMessage: e.target.value })
                }
                placeholder="Su reclamación ha sido registrada..."
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Este mensaje aparece en la página de confirmación después de
                enviar la reclamación
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vista Previa */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa del Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-slate-50 p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Asunto:
                </p>
                <p className="font-medium">
                  {config.emailSubject} - {config.prefix}-2025-001
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-lg font-bold mb-2">
                  Reclamación Registrada
                </h3>
                <p className="mb-4">Estimado/a [Cliente],</p>
                <p className="mb-4">{config.emailMessage}</p>
                <div className="bg-white rounded-lg p-4 my-4 border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Número de Reclamación:</strong>{" "}
                    {config.prefix}-2025-001
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Fecha:</strong> {new Date().toLocaleDateString("es-PE")}
                  </p>
                </div>
                <p className="text-sm">
                  Por favor conserve este número para dar seguimiento a su
                  caso.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Este es un mensaje automático, por favor no responder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  );
}