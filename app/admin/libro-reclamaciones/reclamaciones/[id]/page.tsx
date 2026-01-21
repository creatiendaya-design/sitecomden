"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Mail, Phone, User, FileText, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { getComplaintById, updateComplaintStatus } from "@/actions/complaints";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Complaint {
  id: string;
  complaintNumber: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  status: string;
  formData: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  adminResponse?: string | null;
  respondedAt?: Date | null;
  respondedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  IN_REVIEW: { label: "En Revisión", color: "bg-blue-100 text-blue-700" },
  RESOLVED: { label: "Resuelto", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Cerrado", color: "bg-slate-100 text-slate-700" },
};

export default function ComplaintDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [response, setResponse] = useState("");

  useEffect(() => {
    loadComplaint();
  }, [id]);

  const loadComplaint = async () => {
    setLoading(true);
    const result = await getComplaintById(id);

    if (result.success && result.data) {
      const data = result.data as Complaint;
      setComplaint(data);
      setNewStatus(data.status);
      setResponse(data.adminResponse || "");
    } else {
      toast({
        title: "Error",
        description: "No se pudo cargar la reclamación",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleUpdateStatus = async () => {
    if (!complaint) return;

    setUpdating(true);
    const result = await updateComplaintStatus(
      complaint.id,
      newStatus,
      response || undefined,
      "admin" // TODO: Usar ID del admin autenticado
    );

    if (result.success) {
      toast({
        title: "Actualización exitosa",
        description: "El estado de la reclamación ha sido actualizado",
      });
      loadComplaint();
    } else {
      toast({
        title: "Error",
        description: result.error || "Error al actualizar la reclamación",
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">Reclamación no encontrada</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/admin/libro-reclamaciones">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al listado
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusLabels[complaint.status] || {
    label: complaint.status,
    color: "bg-slate-100 text-slate-700",
  };

  // Extraer datos del formulario
  const formDataMapped = complaint.formData?.mapped || {};
  const formDataOriginal = complaint.formData?.original || {};

  return (
    <div className="container mx-auto py-4 md:py-6 px-4 space-y-4 md:space-y-6">
      {/* Header - RESPONSIVE */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between">
        <div className="flex items-start gap-2 md:gap-4">
          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
            <Link href="/admin/libro-reclamaciones">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-bold truncate">
              Reclamación {complaint.complaintNumber}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Recibida {formatDistanceToNow(new Date(complaint.createdAt), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          </div>
        </div>
        <Badge className={`${statusInfo.color} flex-shrink-0`}>{statusInfo.label}</Badge>
      </div>

      {/* Layout Responsive: columna única en mobile, 2 columnas en desktop */}
      <div className="space-y-4 md:space-y-6 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Información del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                {complaint.customerName && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Nombre</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {complaint.customerName}
                      </p>
                    </div>
                  </div>
                )}

                {complaint.customerEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {complaint.customerEmail}
                      </p>
                    </div>
                  </div>
                )}

                {complaint.customerPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Teléfono</p>
                      <p className="text-sm text-muted-foreground">
                        {complaint.customerPhone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Fecha de envío</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(complaint.createdAt).toLocaleDateString("es-PE", {
                        dateStyle: "long",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos del Formulario */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Detalles de la Reclamación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                {Object.keys(formDataMapped).length > 0 ? (
                  Object.entries(formDataMapped).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-sm font-medium mb-1">{label}</p>
                      <div className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-md break-words">
                        {Array.isArray(value) ? (
                          <ul className="list-disc list-inside space-y-1">
                            {value.map((item, idx) => (
                              <li key={idx}>{String(item)}</li>
                            ))}
                          </ul>
                        ) : typeof value === "object" && value !== null ? (
                          <pre className="whitespace-pre-wrap text-xs md:text-sm overflow-x-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          String(value)
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-10 w-10 md:h-12 md:w-12 mb-2" />
                    <p className="text-sm">No hay datos adicionales del formulario</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Respuesta del Admin */}
          {complaint.adminResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Respuesta del Administrador</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-3 md:p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">
                    {complaint.adminResponse}
                  </p>
                  {complaint.respondedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Respondido el{" "}
                      {new Date(complaint.respondedAt).toLocaleDateString("es-PE", {
                        dateStyle: "long",
                      })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna Lateral */}
        <div className="space-y-4 md:space-y-6">
          {/* Actualizar Estado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Actualizar Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendiente</SelectItem>
                    <SelectItem value="IN_REVIEW">En Revisión</SelectItem>
                    <SelectItem value="RESOLVED">Resuelto</SelectItem>
                    <SelectItem value="CLOSED">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Respuesta al Cliente (Opcional)
                </label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Escribe una respuesta que se enviará al cliente por email..."
                  rows={5}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Si agregas una respuesta, se enviará un email al cliente.
                </p>
              </div>

              <Button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === complaint.status}
                className="w-full"
                size="sm"
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Actualizar y Notificar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Información Técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  ID Interno
                </p>
                <p className="text-xs md:text-sm font-mono break-all">{complaint.id}</p>
              </div>

              {complaint.ipAddress && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Dirección IP
                  </p>
                  <p className="text-xs md:text-sm font-mono">{complaint.ipAddress}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Última actualización
                </p>
                <p className="text-xs md:text-sm">
                  {formatDistanceToNow(new Date(complaint.updatedAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}