"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ExternalLink, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { approvePayment, rejectPayment } from "@/actions/pending-payments";

interface PaymentBannerProps {
  paymentId: string;
  paymentMethod: string;
  proofImageUrl: string | null;
}

export default function PaymentBanner({
  paymentId,
  paymentMethod,
  proofImageUrl,
}: PaymentBannerProps) {
  const router = useRouter();
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      const result = await approvePayment(paymentId);
      if (result.success) {
        toast.success("Pago aprobado. Se envió email al cliente.");
        router.refresh();
      } else {
        toast.error(result.error || "Error al aprobar el pago");
      }
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejectLoading(true);
    setRejectOpen(false);
    try {
      const result = await rejectPayment(paymentId, rejectReason);
      if (result.success) {
        toast.success("Pago rechazado. Se envió email al cliente.");
        router.refresh();
      } else {
        toast.error(result.error || "Error al rechazar el pago");
      }
    } finally {
      setRejectReason("");
      setRejectLoading(false);
    }
  };

  const isLoading = approveLoading || rejectLoading;

  return (
    <>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="font-medium text-amber-900">
            Pago pendiente de verificación · {paymentMethod}
          </p>
          <p className="text-sm text-amber-700 mt-0.5">
            El cliente subió su comprobante de pago.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {proofImageUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={proofImageUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver comprobante
              </a>
            </Button>
          )}
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={isLoading}
          >
            {approveLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-1" />
            )}
            Aprobar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setRejectOpen(true)}
            disabled={isLoading}
          >
            {rejectLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <XCircle className="h-4 w-4 mr-1" />
            )}
            Rechazar
          </Button>
        </div>
      </div>

      <AlertDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email al cliente con el motivo del rechazo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2 space-y-1">
            <Label htmlFor="rejectReason" className="text-sm">
              Motivo del rechazo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: El monto no coincide con el total de la orden"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Rechazar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
