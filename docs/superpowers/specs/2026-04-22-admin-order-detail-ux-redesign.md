# Admin Order Detail — UX/UI Redesign Spec

**Date:** 2026-04-22  
**Page:** `/admin/ordenes/[orderId]`  
**Files:** `app/admin/ordenes/[orderId]/page.tsx`, `order-update-form.tsx`, `EmitDocumentButton.tsx`

---

## Problem

The current page is confusing for store owners because:

1. Three separate status cards (Orden, Pago, Despacho) each look identical — owners don't know which controls what.
2. A single "Guardar Cambios" button saves all four cards at once — unclear what is being saved.
3. Approving a pending payment requires navigating away to `/admin/pagos-pendientes`.
4. Destructive actions (Cancelar orden, Reembolso) are visible inside normal-flow cards, causing anxiety.
5. The Despacho section (frequent action: tracking + courier) is buried in the sidebar.
6. No visual hierarchy — all information has the same weight.

---

## Design: Shopify-inspired Layout

### 1. Header

- Left: back button + order number (`PED-0042`) + date
- Center/Left: three color-coded status pills inline — **Estado de orden** · **Estado de pago** · **Estado de despacho**
- Right: **"Más acciones" dropdown** containing destructive/special actions only when they are valid for current state:
  - Cancelar orden (only when `canCancelOrder`)
  - Procesar reembolso (only when `canRefundPayment`)
  - Marcar pago como fallido (only when `canMarkPaymentAsFailed`)

Status pill colors:
- PENDING / VERIFYING / PROCESSING → amber
- PAID / CONFIRMED / DELIVERED / ISSUED → green
- CANCELLED / FAILED / ERROR → red
- SHIPPED / IN_TRANSIT → blue

---

### 2. Contextual Action Banner

Appears **below the header** only when an urgent action is required. Hidden when no action is pending.

**Case A — Payment pending verification** (`paymentStatus === "VERIFYING"`):
- Background: amber
- Text: "Pago pendiente de verificación · [paymentMethod]" + "El cliente subió su comprobante de pago."
- Buttons inline: `[Ver comprobante]` → opens image in new tab | `[✓ Aprobar pago]` | `[✗ Rechazar]`
- Approval/rejection is handled **on this page** via the existing `approvePayment(paymentId)` / `rejectPayment(paymentId, reason)` server actions from `actions/pending-payments.ts`. The banner receives `order.pendingPayment.id` as prop. No redirect to `/admin/pagos-pendientes`.

**Case B — SUNAT document pending** (`order.documentType` is set AND `order.paymentStatus === "PAID"` AND no `electronicDocument` or status is not `"ISSUED"`):
- Background: blue-50
- Text: "Comprobante electrónico pendiente de emitir"
- Button: `[Emitir ahora]` → calls existing `emitDocumentAction`

**Case C — No pending action**: Banner does not render.

---

### 3. Two-Column Layout

#### Left column — 2/3 width

**Card: Productos**
- No changes. Items list + subtotal/shipping/discount/total.

**Card: Despacho** *(moved from sidebar)*
- Estado de despacho: dropdown showing only valid transitions from `FULFILLMENT_STATUS_TRANSITIONS`
- Tracking number: text input
- Courier: text input
- Button: **"Guardar envío"** — appears enabled only when any field has changed vs. current values. On save, calls `updateOrderStatus` with only the changed fields.
- Shows "Estado final — No se puede modificar" when `isTerminalFulfillmentStatus`.

**Card: Cliente**
- No changes. Name, email, phone, DNI (read-only).

**Card: Dirección de envío**
- No changes. Address, district, city, department, reference (read-only).

**Card: Notas del cliente** *(conditional)*
- No changes. Shown only when `order.customerNotes` exists.

#### Right sidebar — 1/3 width

**Card: Estado de la orden**
- Shows current status as a colored badge.
- Dropdown to select next valid status (from `ORDER_STATUS_TRANSITIONS`).
- Button: **"Actualizar estado"** — enabled only when selection differs from current. On save, calls `updateOrderStatus`.
- Shows "Estado final" message when `isTerminalOrderStatus`.

**Card: Pago**
- Shows payment method and current payment status badge.
- Shows `paidAt` date if paid.
- If `paymentStatus === "VERIFYING"`: shows a compact "Ver comprobante" link (the banner above handles the primary action, this is a secondary reference).
- No special action buttons here — those live in "Más acciones" dropdown.

**Card: Comprobante electrónico** *(conditional — only if `order.documentType` is set)*
- Same logic as current implementation:
  - ISSUED: badge + number + PDF/XML download + "Reenviar email" button
  - ERROR: badge + error message + "Emitir ahora" button
  - PENDING/no document: handled by the banner above; card shows document type + RUC info for reference

**Card: Notas internas**
- Textarea for `adminNotes`.
- Button: **"Guardar nota"** — enabled only when text changed. On save, calls `updateOrderStatus` with only `adminNotes`.

**Card: Fechas importantes**
- No changes. Creada, Pagada, Enviada, Entregada (read-only).

**Card: Link para cliente** *(conditional — only if `viewLink` exists)*
- No changes. Read-only input + copy button.

---

### 4. Inline Save Pattern

- **No global "Guardar Cambios" button.**
- Each editable section has its own save button.
- Save buttons are **disabled by default** and enable only when the user changes a value from its current state.
- On successful save: `router.refresh()` + `toast.success(...)`.
- On error: `toast.error(...)`.

This is the same pattern Shopify uses — each section is independently actionable and the UI communicates exactly what will be saved.

---

## Files to Change

| File | Change |
|---|---|
| `app/admin/ordenes/[orderId]/page.tsx` | Full restructure: header, banner, two-column layout |
| `app/admin/ordenes/[orderId]/order-update-form.tsx` | Split into: `OrderStatusCard`, `FulfillmentCard`, `AdminNotesCard` |
| `app/admin/ordenes/[orderId]/EmitDocumentButton.tsx` | No changes needed |
| New: `app/admin/ordenes/[orderId]/PaymentBanner.tsx` | Client component for the contextual action banner |
| New: `app/admin/ordenes/[orderId]/MoreActionsMenu.tsx` | Client component for the "Más acciones" dropdown |

---

## Out of Scope

- No changes to server actions (`actions/orders.ts`, `actions/pending-payments.ts`, `actions/sunat.ts`)
- No changes to `lib/order-status-logic.ts`
- No changes to the orders list page (`/admin/ordenes`)
- No mobile-specific layout changes (admin is desktop-first)
