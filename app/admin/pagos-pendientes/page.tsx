"use client";

import { useEffect, useState } from "react";
import {
  getPendingPayments,
  approvePayment,
  rejectPayment,
} from "@/actions/pending-payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface PendingPayment {
  id: string;
  orderId: string;
  method: string;
  amount: number;
  reference: string | null;
  proofImage: string | null;
  status: string;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    total: number;
    createdAt: string;
  };
}

export default function PendingPaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [viewImageModal, setViewImageModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    const result = await getPendingPayments();
    if (result.success && result.data) {
      setPayments(result.data);
    } else {
      setError(result.error || "Error al cargar pagos");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleApprove = async (paymentId: string) => {
    if (!confirm("¿Confirmar que este pago es válido?")) return;

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await approvePayment(paymentId);

    if (result.success) {
      setSuccessMessage("Pago aprobado correctamente");
      await loadPayments();
    } else {
      setError(result.error || "Error al aprobar pago");
    }

    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedPayment) return;

    if (!rejectionReason.trim()) {
      setError("Ingresa una razón para el rechazo");
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);

    const result = await rejectPayment(selectedPayment.id, rejectionReason);

    if (result.success) {
      setSuccessMessage("Pago rechazado");
      setRejectModal(false);
      setSelectedPayment(null);
      setRejectionReason("");
      await loadPayments();
    } else {
      setError(result.error || "Error al rechazar pago");
    }

    setActionLoading(false);
  };

  const openRejectModal = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setRejectModal(true);
    setError(null);
  };

  const openImageModal = (payment: PendingPayment) => {
    setSelectedPayment(payment);
    setViewImageModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagos Pendientes</h1>
          <p className="text-muted-foreground">Verifica pagos de Yape y Plin</p>
        </div>
        <Button onClick={loadPayments} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagos Pendientes
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Con Comprobante
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payments.filter((p) => p.proofImage).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(payments.reduce((sum, p) => sum + p.amount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay pagos pendientes de verificación</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Comprobante Preview */}
                  <div className="flex-shrink-0">
                    {payment.proofImage ? (
                      <div
                        className="relative w-full md:w-32 h-32 rounded-lg overflow-hidden border-2 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => openImageModal(payment)}
                      >
                        <Image
                          src={payment.proofImage}
                          alt="Comprobante"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full md:w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center">
                        <p className="text-xs text-muted-foreground text-center">
                          Sin comprobante
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/admin/ordenes/${payment.order.id}`}
                            className="text-lg font-semibold hover:underline"
                          >
                            Orden #{payment.order.orderNumber}
                          </Link>
                          <Badge variant="outline">{payment.method}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payment.order.customerName} • {payment.order.customerEmail}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {formatPrice(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {payment.reference && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">N° Operación:</span>
                        <span className="font-mono font-medium">
                          {payment.reference}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        onClick={() => handleApprove(payment.id)}
                        disabled={actionLoading || !payment.proofImage}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprobar Pago
                      </Button>
                      <Button
                        onClick={() => openRejectModal(payment)}
                        disabled={actionLoading}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                      {payment.proofImage && (
                        <Button
                          onClick={() => openImageModal(payment)}
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Comprobante
                        </Button>
                      )}
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <Link href={`/admin/ordenes/${payment.order.id}`}>
                          Ver Orden
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Ver Imagen */}
      <Dialog open={viewImageModal} onOpenChange={setViewImageModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
            <DialogDescription>
              Orden #{selectedPayment?.order.orderNumber} •{" "}
              {selectedPayment?.order.customerName}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment?.proofImage && (
            <div className="relative w-full aspect-video">
              <Image
                src={selectedPayment.proofImage}
                alt="Comprobante"
                fill
                className="object-contain"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewImageModal(false)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setViewImageModal(false);
                if (selectedPayment) handleApprove(selectedPayment.id);
              }}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Aprobar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rechazar */}
      <Dialog open={rejectModal} onOpenChange={setRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Pago</DialogTitle>
            <DialogDescription>
              Orden #{selectedPayment?.order.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Razón del Rechazo</Label>
              <Textarea
                id="reason"
                placeholder="Ej: El monto no coincide, la imagen no es clara..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectModal(false);
                setRejectionReason("");
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-1" />
              )}
              Rechazar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}