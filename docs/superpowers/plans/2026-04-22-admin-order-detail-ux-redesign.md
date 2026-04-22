# Admin Order Detail — UX/UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/admin/ordenes/[orderId]` to follow a Shopify-inspired layout with a contextual action banner, inline save per section, destructive actions in a "Más acciones" dropdown, and the Despacho section moved to the main column.

**Architecture:** Split the monolithic `order-update-form.tsx` into focused client components (`OrderStatusCard`, `FulfillmentCard`, `AdminNotesCard`). Add two new components: `PaymentBanner` (handles payment approval/rejection inline) and `MoreActionsMenu` (wraps destructive actions). Restructure `page.tsx` with the new header, banners, and two-column layout.

**Tech Stack:** Next.js App Router, Prisma, shadcn/ui (Card, Badge, Button, Select, DropdownMenu, AlertDialog), sonner (toast), `actions/orders.ts`, `actions/pending-payments.ts`, `lib/order-status-logic.ts`

**Note:** This project has no automated tests (`CLAUDE.md`: "There are no automated tests in this project"). Steps skip TDD cycle and verify manually via `npm run build` and visual inspection.

**Spec:** `docs/superpowers/specs/2026-04-22-admin-order-detail-ux-redesign.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/admin/ordenes/[orderId]/OrderStatusCard.tsx` | Order status dropdown + inline save |
| Create | `app/admin/ordenes/[orderId]/FulfillmentCard.tsx` | Fulfillment status + tracking + courier inline save |
| Create | `app/admin/ordenes/[orderId]/AdminNotesCard.tsx` | Admin notes textarea + inline save |
| Create | `app/admin/ordenes/[orderId]/MoreActionsMenu.tsx` | "Más acciones" dropdown with destructive actions |
| Create | `app/admin/ordenes/[orderId]/PaymentBanner.tsx` | Contextual banner for pending payment verification |
| Modify | `app/admin/ordenes/[orderId]/page.tsx` | Full restructure: new header, banners, two-column layout |
| Delete | `app/admin/ordenes/[orderId]/order-update-form.tsx` | Replaced by the 3 new cards above |
| No change | `app/admin/ordenes/[orderId]/EmitDocumentButton.tsx` | Used as-is |
| No change | `app/admin/ordenes/[orderId]/copy-link-button.tsx` | Used as-is |

---

## Task 1: OrderStatusCard component

**Files:**
- Create: `app/admin/ordenes/[orderId]/OrderStatusCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  isTerminalOrderStatus,
} from "@/lib/order-status-logic";

interface OrderStatusCardProps {
  orderId: string;
  currentStatus: string;
}

export default function OrderStatusCard({
  orderId,
  currentStatus,
}: OrderStatusCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const allowedStatuses =
    ORDER_STATUS_TRANSITIONS[
      currentStatus as keyof typeof ORDER_STATUS_TRANSITIONS
    ] || [];
  const hasChanged = status !== currentStatus;

  const handleSave = async () => {
    if (!hasChanged) return;
    setLoading(true);
    const result = await updateOrderStatus({ orderId, status: status as any });
    if (result.success) {
      toast.success("Estado de orden actualizado");
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar el estado");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Estado de la orden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Actual</Label>
          <p className="font-medium">
            {ORDER_STATUS_LABELS[currentStatus as keyof typeof ORDER_STATUS_LABELS]}
          </p>
        </div>

        {isTerminalOrderStatus(currentStatus as any) ? (
          <p className="text-sm text-muted-foreground">
            Estado final — no se puede modificar
          </p>
        ) : allowedStatuses.length > 0 ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Cambiar a</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleSave}
              disabled={!hasChanged || loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Actualizar estado
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|OrderStatusCard"
```

Expected: no errors mentioning `OrderStatusCard`.

- [ ] **Step 3: Commit**

```bash
git add app/admin/ordenes/\[orderId\]/OrderStatusCard.tsx
git commit -m "feat: add OrderStatusCard inline-save component"
```

---

## Task 2: FulfillmentCard component

**Files:**
- Create: `app/admin/ordenes/[orderId]/FulfillmentCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";
import {
  FULFILLMENT_STATUS_TRANSITIONS,
  FULFILLMENT_STATUS_LABELS,
  isTerminalFulfillmentStatus,
} from "@/lib/order-status-logic";

interface FulfillmentCardProps {
  orderId: string;
  currentFulfillmentStatus: string;
  currentTrackingNumber: string;
  currentShippingCourier: string;
}

export default function FulfillmentCard({
  orderId,
  currentFulfillmentStatus,
  currentTrackingNumber,
  currentShippingCourier,
}: FulfillmentCardProps) {
  const router = useRouter();
  const [fulfillmentStatus, setFulfillmentStatus] = useState(currentFulfillmentStatus);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber);
  const [shippingCourier, setShippingCourier] = useState(currentShippingCourier);
  const [loading, setLoading] = useState(false);

  const allowedStatuses =
    FULFILLMENT_STATUS_TRANSITIONS[
      currentFulfillmentStatus as keyof typeof FULFILLMENT_STATUS_TRANSITIONS
    ] || [];

  const hasChanged =
    fulfillmentStatus !== currentFulfillmentStatus ||
    trackingNumber !== currentTrackingNumber ||
    shippingCourier !== currentShippingCourier;

  const handleSave = async () => {
    if (!hasChanged) return;
    setLoading(true);
    const result = await updateOrderStatus({
      orderId,
      fulfillmentStatus:
        fulfillmentStatus !== currentFulfillmentStatus
          ? (fulfillmentStatus as any)
          : undefined,
      trackingNumber:
        trackingNumber !== currentTrackingNumber ? trackingNumber : undefined,
      shippingCourier:
        shippingCourier !== currentShippingCourier ? shippingCourier : undefined,
    });
    if (result.success) {
      toast.success("Información de despacho actualizada");
      router.refresh();
    } else {
      toast.error(result.error || "Error al actualizar el despacho");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Despacho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Estado actual</Label>
          <p className="font-medium">
            {FULFILLMENT_STATUS_LABELS[currentFulfillmentStatus as keyof typeof FULFILLMENT_STATUS_LABELS]}
          </p>
        </div>

        {isTerminalFulfillmentStatus(currentFulfillmentStatus as any) ? (
          <p className="text-sm text-muted-foreground">
            Estado final — no se puede modificar
          </p>
        ) : allowedStatuses.length > 0 ? (
          <div className="space-y-1">
            <Label className="text-xs">Cambiar estado</Label>
            <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {FULFILLMENT_STATUS_LABELS[s as keyof typeof FULFILLMENT_STATUS_LABELS]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1">
          <Label htmlFor="trackingNumber" className="text-xs">
            Número de tracking
          </Label>
          <Input
            id="trackingNumber"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Ej: OLVA123456"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="shippingCourier" className="text-xs">
            Courier
          </Label>
          <Input
            id="shippingCourier"
            value={shippingCourier}
            onChange={(e) => setShippingCourier(e.target.value)}
            placeholder="Ej: Olva Courier"
          />
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={!hasChanged || loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Guardar envío
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/ordenes/\[orderId\]/FulfillmentCard.tsx
git commit -m "feat: add FulfillmentCard inline-save component"
```

---

## Task 3: AdminNotesCard component

**Files:**
- Create: `app/admin/ordenes/[orderId]/AdminNotesCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";

interface AdminNotesCardProps {
  orderId: string;
  currentAdminNotes: string;
}

export default function AdminNotesCard({
  orderId,
  currentAdminNotes,
}: AdminNotesCardProps) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState(currentAdminNotes);
  const [loading, setLoading] = useState(false);

  const hasChanged = adminNotes !== currentAdminNotes;

  const handleSave = async () => {
    if (!hasChanged) return;
    setLoading(true);
    const result = await updateOrderStatus({ orderId, adminNotes });
    if (result.success) {
      toast.success("Nota interna guardada");
      router.refresh();
    } else {
      toast.error(result.error || "Error al guardar la nota");
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notas internas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="adminNotes" className="text-xs text-muted-foreground">
            Visible solo para el equipo
          </Label>
          <Textarea
            id="adminNotes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Notas internas..."
            rows={3}
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          onClick={handleSave}
          disabled={!hasChanged || loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Guardar nota
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/ordenes/\[orderId\]/AdminNotesCard.tsx
git commit -m "feat: add AdminNotesCard inline-save component"
```

---

## Task 4: MoreActionsMenu component

**Files:**
- Create: `app/admin/ordenes/[orderId]/MoreActionsMenu.tsx`

This is a client component that renders a dropdown button with Cancelar, Reembolso, and Fallido — each showing a confirmation dialog. The component returns `null` if no action is currently valid, so the button doesn't appear on completed/cancelled orders.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/actions/orders";
import {
  canCancelOrder,
  canRefundPayment,
  canMarkPaymentAsFailed,
} from "@/lib/order-status-logic";

interface MoreActionsMenuProps {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
}

export default function MoreActionsMenu({
  orderId,
  orderStatus,
  paymentStatus,
}: MoreActionsMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [failedOpen, setFailedOpen] = useState(false);

  const showCancel = canCancelOrder(orderStatus as any);
  const showRefund = canRefundPayment(paymentStatus as any);
  const showFailed = canMarkPaymentAsFailed(paymentStatus as any);

  if (!showCancel && !showRefund && !showFailed) return null;

  const handleCancelOrder = async () => {
    setLoading(true);
    setCancelOpen(false);
    const result = await updateOrderStatus({ orderId, status: "CANCELLED" as any });
    if (result.success) {
      toast.success("Orden cancelada. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al cancelar la orden");
    }
    setLoading(false);
  };

  const handleRefundPayment = async () => {
    setLoading(true);
    setRefundOpen(false);
    const result = await updateOrderStatus({ orderId, paymentStatus: "REFUNDED" as any });
    if (result.success) {
      toast.success("Reembolso procesado. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al procesar el reembolso");
    }
    setLoading(false);
  };

  const handleMarkAsFailed = async () => {
    setLoading(true);
    setFailedOpen(false);
    const result = await updateOrderStatus({ orderId, paymentStatus: "FAILED" as any });
    if (result.success) {
      toast.success("Pago marcado como fallido. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al marcar como fallido");
    }
    setLoading(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Más acciones
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showCancel && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={() => setCancelOpen(true)}
            >
              Cancelar orden
            </DropdownMenuItem>
          )}
          {showRefund && (
            <DropdownMenuItem
              className="text-amber-600 focus:text-amber-600 focus:bg-amber-50"
              onClick={() => setRefundOpen(true)}
            >
              Procesar reembolso
            </DropdownMenuItem>
          )}
          {showFailed && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              onClick={() => setFailedOpen(true)}
            >
              Marcar pago como fallido
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email de notificación al cliente.
              {paymentStatus === "PAID" && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Esta orden ya fue pagada. Considera procesar un reembolso primero.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-red-600 hover:bg-red-700"
            >
              Sí, cancelar orden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Procesar reembolso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email al cliente. El dinero será devuelto en 5-7 días hábiles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefundPayment}>
              Confirmar reembolso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={failedOpen} onOpenChange={setFailedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar pago como fallido?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un email al cliente sugiriendo intentar con otro método de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAsFailed}
              className="bg-red-600 hover:bg-red-700"
            >
              Marcar como fallido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/ordenes/\[orderId\]/MoreActionsMenu.tsx
git commit -m "feat: add MoreActionsMenu component for destructive order actions"
```

---

## Task 5: PaymentBanner component

**Files:**
- Create: `app/admin/ordenes/[orderId]/PaymentBanner.tsx`

This banner shows when `order.paymentStatus === "VERIFYING"`. It receives `order.pendingPayment.id` (to call `approvePayment`/`rejectPayment`) and `order.pendingPayment.proofImage` (to link to the uploaded proof). The reject flow shows a modal with a required reason field.

- [ ] **Step 1: Create the file**

```tsx
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
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    const result = await approvePayment(paymentId);
    if (result.success) {
      toast.success("Pago aprobado. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al aprobar el pago");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading(true);
    setRejectOpen(false);
    const result = await rejectPayment(paymentId, rejectReason);
    if (result.success) {
      toast.success("Pago rechazado. Se envió email al cliente.");
      router.refresh();
    } else {
      toast.error(result.error || "Error al rechazar el pago");
    }
    setRejectReason("");
    setLoading(false);
  };

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
            disabled={loading}
          >
            {loading ? (
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
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-1" />
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
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/ordenes/\[orderId\]/PaymentBanner.tsx
git commit -m "feat: add PaymentBanner for inline payment approval/rejection"
```

---

## Task 6: Restructure page.tsx

**Files:**
- Modify: `app/admin/ordenes/[orderId]/page.tsx`

This is the main restructure. The page gets a new header with 3 status pills + `MoreActionsMenu`, contextual banners below the header, and a two-column layout with `FulfillmentCard` moved to the main column.

The `getStatusPillClass` helper maps each possible status value to a Tailwind color class:
- Order: PENDING/PROCESSING → amber | PAID/DELIVERED/SHIPPED → see below | CANCELLED → red | REFUNDED → slate
- Payment: PENDING/VERIFYING → amber | PAID → green | FAILED → red | REFUNDED → slate
- Fulfillment: UNFULFILLED → amber | PARTIAL → blue | FULFILLED → green
- SHIPPED (order status) → blue

- [ ] **Step 1: Replace the full contents of page.tsx**

```tsx
import { prisma } from "@/lib/db";
import { formatPrice, formatOrderNumber } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, FileText, MapPin, Package, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import CopyLinkButton from "./copy-link-button";
import { EmitDocumentButton, ResendComprobanteButton } from "./EmitDocumentButton";
import OrderStatusCard from "./OrderStatusCard";
import FulfillmentCard from "./FulfillmentCard";
import AdminNotesCard from "./AdminNotesCard";
import MoreActionsMenu from "./MoreActionsMenu";
import PaymentBanner from "./PaymentBanner";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_LABELS,
} from "@/lib/order-status-logic";

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

function getStatusPillClass(status: string): string {
  const green = ["PAID", "DELIVERED", "FULFILLED", "ISSUED"];
  const amber = ["PENDING", "VERIFYING", "PROCESSING", "UNFULFILLED", "PARTIAL"];
  const red = ["CANCELLED", "FAILED", "ERROR"];
  const blue = ["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
  const slate = ["REFUNDED"];

  if (green.includes(status)) return "bg-green-100 text-green-700";
  if (amber.includes(status)) return "bg-amber-100 text-amber-700";
  if (red.includes(status)) return "bg-red-100 text-red-700";
  if (blue.includes(status)) return "bg-blue-100 text-blue-700";
  if (slate.includes(status)) return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
}

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = await params;

  const siteSettings = await getSiteSettings();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, slug: true, images: true } },
          variant: { select: { id: true, sku: true, options: true, image: true } },
        },
      },
      pendingPayment: true,
      electronicDocument: true,
    },
  });

  if (!order) notFound();

  const shippingAddress = order.shippingAddress as any;
  const orderPrefix = siteSettings.order_prefix || "PED";
  const baseUrl = siteSettings.site_url || "http://localhost:3000";
  const orderDisplayNumber = (order as any).orderSeq
    ? formatOrderNumber((order as any).orderSeq, orderPrefix)
    : `#${order.orderNumber.slice(-8).toUpperCase()}`;
  const viewLink = order.viewToken
    ? `${baseUrl}/orden/verificar?token=${order.viewToken}&email=${order.customerEmail}`
    : null;

  const showSunatBanner =
    !!order.documentType &&
    order.paymentStatus === "PAID" &&
    (!order.electronicDocument || order.electronicDocument.status !== "ISSUED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/ordenes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{orderDisplayNumber}</h1>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleString("es-PE", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusPillClass(order.status)}`}>
            {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS] ?? order.status}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusPillClass(order.paymentStatus)}`}>
            {PAYMENT_STATUS_LABELS[order.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? order.paymentStatus}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusPillClass(order.fulfillmentStatus)}`}>
            {FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus as keyof typeof FULFILLMENT_STATUS_LABELS] ?? order.fulfillmentStatus}
          </span>
          <MoreActionsMenu
            orderId={order.id}
            orderStatus={order.status}
            paymentStatus={order.paymentStatus}
          />
        </div>
      </div>

      {/* Contextual Banners */}
      {order.paymentStatus === "VERIFYING" && order.pendingPayment && (
        <PaymentBanner
          paymentId={order.pendingPayment.id}
          paymentMethod={order.paymentMethod}
          proofImageUrl={order.pendingPayment.proofImage ?? null}
        />
      )}

      {showSunatBanner && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-blue-900">
            📄 Comprobante electrónico pendiente de emitir
          </p>
          <EmitDocumentButton orderId={order.id} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Productos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {(item.image || item.variant?.image) && (
                      <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                        <Image
                          src={item.image || item.variant?.image || ""}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.variantName && (
                        <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      )}
                      {item.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      )}
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.quantity} × {formatPrice(Number(item.price))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice(Number(item.price) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío:</span>
                  <span>{formatPrice(Number(order.shipping))}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="text-green-600">
                      -{formatPrice(Number(order.discount))}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatPrice(Number(order.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Despacho — moved from sidebar */}
          <FulfillmentCard
            orderId={order.id}
            currentFulfillmentStatus={order.fulfillmentStatus}
            currentTrackingNumber={order.trackingNumber || ""}
            currentShippingCourier={order.shippingCourier || ""}
          />

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nombre:</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">{order.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono:</p>
                <p className="font-medium">{order.customerPhone}</p>
              </div>
              {order.customerDni && (
                <div>
                  <p className="text-sm text-muted-foreground">DNI:</p>
                  <p className="font-medium">{order.customerDni}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dirección */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección de Envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{shippingAddress.address}</p>
              <p className="text-muted-foreground">
                {shippingAddress.district}, {shippingAddress.city}
              </p>
              <p className="text-muted-foreground">{shippingAddress.department}</p>
              {shippingAddress.reference && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Referencia: {shippingAddress.reference}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notas del cliente */}
          {order.customerNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.customerNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estado de la orden */}
          <OrderStatusCard orderId={order.id} currentStatus={order.status} />

          {/* Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{order.paymentMethod}</p>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusPillClass(order.paymentStatus)}`}
              >
                {PAYMENT_STATUS_LABELS[order.paymentStatus as keyof typeof PAYMENT_STATUS_LABELS] ?? order.paymentStatus}
              </span>
              {order.paidAt && (
                <p className="text-sm text-muted-foreground">
                  Pagado: {new Date(order.paidAt).toLocaleString("es-PE")}
                </p>
              )}
              {order.paymentStatus === "VERIFYING" && order.pendingPayment?.proofImage && (
                <Button variant="outline" size="sm" className="mt-1" asChild>
                  <a
                    href={order.pendingPayment.proofImage}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver comprobante
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Comprobante electrónico */}
          {order.documentType && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Comprobante Electrónico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.electronicDocument ? (
                  order.electronicDocument.status === "ISSUED" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">Emitido</Badge>
                        <span className="font-mono font-medium text-sm">
                          {order.electronicDocument.fullNumber}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.electronicDocument.issuedAt?.toLocaleString("es-PE")}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {order.electronicDocument.pdfUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={order.electronicDocument.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Descargar PDF
                            </a>
                          </Button>
                        )}
                        {order.electronicDocument.xmlUrl && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={order.electronicDocument.xmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Descargar XML
                            </a>
                          </Button>
                        )}
                        <ResendComprobanteButton orderId={order.id} />
                      </div>
                    </div>
                  ) : order.electronicDocument.status === "ERROR" ? (
                    <div className="space-y-3">
                      <Badge variant="destructive">Error</Badge>
                      <p className="text-sm text-red-600">
                        {order.electronicDocument.errorMessage}
                      </p>
                      <EmitDocumentButton orderId={order.id} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>
                      <p className="text-sm text-muted-foreground">
                        {order.documentType === "BOLETA" ? "Boleta de Venta" : "Factura"}
                        {order.documentType === "FACTURA" && order.buyerRuc && (
                          <> — RUC: {order.buyerRuc} ({order.buyerRazonSocial})</>
                        )}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Tipo:{" "}
                      <strong>
                        {order.documentType === "BOLETA" ? "Boleta de Venta" : "Factura"}
                      </strong>
                      {order.documentType === "FACTURA" && order.buyerRuc && (
                        <> — RUC: {order.buyerRuc} ({order.buyerRazonSocial})</>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notas internas */}
          <AdminNotesCard
            orderId={order.id}
            currentAdminNotes={order.adminNotes || ""}
          />

          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Fechas importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">Creada</p>
                <p className="text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString("es-PE")}
                </p>
              </div>
              {order.paidAt && (
                <div>
                  <p className="font-medium">Pagada</p>
                  <p className="text-muted-foreground">
                    {new Date(order.paidAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
              {order.shippedAt && (
                <div>
                  <p className="font-medium">Enviada</p>
                  <p className="text-muted-foreground">
                    {new Date(order.shippedAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
              {order.deliveredAt && (
                <div>
                  <p className="font-medium">Entregada</p>
                  <p className="text-muted-foreground">
                    {new Date(order.deliveredAt).toLocaleString("es-PE")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link para cliente */}
          {viewLink && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Link para cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={viewLink}
                    readOnly
                    className="flex-1 text-xs bg-slate-50 border rounded px-2 py-1"
                  />
                  <CopyLinkButton link={viewLink} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run the build to check for TypeScript errors**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds with no TypeScript errors. Common issues to watch for:
- `order.fulfillmentStatus` — if TypeScript complains, cast as `string`
- `order.buyerRuc` / `order.buyerRazonSocial` — if missing from Prisma types, cast `order as any`
- Missing props on any new component

Fix any errors before committing.

- [ ] **Step 3: Commit**

```bash
git add app/admin/ordenes/\[orderId\]/page.tsx
git commit -m "feat: restructure admin order detail page with Shopify-inspired layout"
```

---

## Task 7: Remove order-update-form.tsx and verify final build

**Files:**
- Delete: `app/admin/ordenes/[orderId]/order-update-form.tsx`

- [ ] **Step 1: Delete the old file**

```bash
rm "app/admin/ordenes/[orderId]/order-update-form.tsx"
```

- [ ] **Step 2: Verify nothing still imports it**

```bash
grep -r "order-update-form" app/
```

Expected: no output (no remaining imports).

- [ ] **Step 3: Run the final build**

```bash
npm run build
```

Expected: clean build with no errors.

- [ ] **Step 4: Start dev server and do a visual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/admin/ordenes` and click into any order. Verify:
- Header shows order number + date + 3 status pills
- "Más acciones" button appears for non-terminal orders (and is hidden for cancelled/delivered ones)
- On an order with `paymentStatus === VERIFYING`: amber banner appears with Aprobar/Rechazar buttons
- Despacho card appears in the main left column (not sidebar)
- OrderStatusCard appears in the sidebar with its own save button
- AdminNotesCard appears in the sidebar with its own save button
- Old "Guardar Cambios" button is gone

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove order-update-form.tsx replaced by split components"
```
