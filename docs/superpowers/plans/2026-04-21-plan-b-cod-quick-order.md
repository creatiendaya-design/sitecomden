# COD Quick Order Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-product COD (cash on delivery) quick order form — a floating modal on the product page and cart page — as an alternative to the standard card-payment checkout. Each product is independently configured as STANDARD, COD_ONLY, or COD_AND_CART.

**Architecture:** A `checkoutMode` enum and a `codFormSettings` JSON field are added to `Product`. The `ProductActions` component reads `checkoutMode` and conditionally renders a "Comprar ahora" button that opens `CodOrderModal`. A new `createCodOrder` server action creates the order with `paymentMethod: "COD"`. The cart page shows a secondary COD button when COD-enabled products are present.

**Tech Stack:** Next.js 16, Prisma 6, Tailwind CSS v4, shadcn/ui (Radix Dialog), Zod 4, Server Actions, `lib/districts-peru.ts` (existing), Zustand (existing cart store)

> **Note:** This project has no automated tests. Each task ends with a manual verification step.

---

## File Map

**New files:**
- `lib/types/cod-form.ts` — TypeScript types for `CodFormSettings`
- `actions/cod-orders.ts` — `createCodOrder` server action
- `components/shop/CodOrderModal.tsx` — floating modal with form + thank-you screen
- `components/admin/CodFormConfig.tsx` — admin panel for COD form configuration

**Modified files:**
- `prisma/schema.prisma` — add `CheckoutMode` enum, `checkoutMode` and `codFormSettings` fields to `Product`
- `lib/validations.ts` — add Zod schema for `CodFormSettings` and COD order input
- `components/shop/ProductActions.tsx` (or `AddToCartButton.tsx`) — checkout-mode-aware buttons
- `components/admin/EditProductForm.tsx` — add "Modo de Compra" card with `CodFormConfig`
- `components/admin/NewProductForm.tsx` — add "Modo de Compra" card
- `store/cart.ts` — prevent `COD_ONLY` products from being added to cart
- `app/(checkout)/carrito/page.tsx` — add COD button when applicable
- `app/api/admin/products/[productId]/update/route.ts` — accept new fields

---

## Task 1: Prisma Schema — CheckoutMode enum and Product fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enum and fields**

Open `prisma/schema.prisma`. After the `ProductTemplate` enum, add:

```prisma
enum CheckoutMode {
  STANDARD
  COD_ONLY
  COD_AND_CART
}
```

Inside the `Product` model, after the `template` field, add:

```prisma
  checkoutMode     CheckoutMode  @default(STANDARD)
  codFormSettings  Json?
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_checkout_mode_to_product
```

Expected: migration created, Prisma client regenerated, no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add CheckoutMode enum and codFormSettings to Product"
```

---

## Task 2: TypeScript types for CodFormSettings

**Files:**
- Create: `lib/types/cod-form.ts`

- [ ] **Step 1: Create types file**

```typescript
// lib/types/cod-form.ts

export type CheckoutMode = "STANDARD" | "COD_ONLY" | "COD_AND_CART";

export interface CodFormField {
  id: "name" | "phone" | "email" | "dni" | "location" | "address" | "notes";
  label: string;
  required: boolean;
  visible: boolean;
}

export interface CodFormSettings {
  formTitle: string;
  formSubtitle?: string;
  buttonText: string;
  paymentBadge?: string;
  thankYouTitle: string;
  thankYouMessage: string;
  whatsappEnabled: boolean;
  whatsappNumber?: string;
  whatsappMessage?: string;
  fields: CodFormField[];
}

export const DEFAULT_COD_FORM_SETTINGS: CodFormSettings = {
  formTitle: "🛒 Completa tu pedido",
  formSubtitle: "Envío a todo el Perú",
  buttonText: "Confirmar pedido →",
  paymentBadge: "✅ Pagas cuando recibes el producto",
  thankYouTitle: "¡Gracias por tu pedido! 🎉",
  thankYouMessage: "Nos comunicaremos contigo en breve para coordinar la entrega.",
  whatsappEnabled: false,
  whatsappNumber: "",
  whatsappMessage:
    "Hola, hice un pedido:\nProducto: {producto}\nNombre: {nombre}\nTel: {telefono}\nDirección: {direccion}, {distrito}\nTotal: S/ {total}",
  fields: [
    { id: "name",     label: "Nombre completo",             required: true,  visible: true },
    { id: "phone",    label: "Teléfono / WhatsApp",         required: true,  visible: true },
    { id: "email",    label: "Correo electrónico",          required: false, visible: true },
    { id: "dni",      label: "DNI",                         required: false, visible: false },
    { id: "location", label: "Departamento / Provincia / Distrito", required: true, visible: true },
    { id: "address",  label: "Dirección de entrega",        required: true,  visible: true },
    { id: "notes",    label: "Notas adicionales",           required: false, visible: false },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/cod-form.ts
git commit -m "feat: add CodFormSettings TypeScript types"
```

---

## Task 3: Zod validation schemas

**Files:**
- Modify: `lib/validations.ts`

- [ ] **Step 1: Add schemas to validations.ts**

Open `lib/validations.ts` and append at the end:

```typescript
// COD form settings schema
export const codFormFieldSchema = z.object({
  id: z.enum(["name", "phone", "email", "dni", "location", "address", "notes"]),
  label: z.string().min(1),
  required: z.boolean(),
  visible: z.boolean(),
});

export const codFormSettingsSchema = z.object({
  formTitle: z.string().min(1),
  formSubtitle: z.string().optional(),
  buttonText: z.string().min(1),
  paymentBadge: z.string().optional(),
  thankYouTitle: z.string().min(1),
  thankYouMessage: z.string().min(1),
  whatsappEnabled: z.boolean(),
  whatsappNumber: z.string().optional(),
  whatsappMessage: z.string().optional(),
  fields: z.array(codFormFieldSchema),
});

// COD order creation schema
export const createCodOrderSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(99),
  name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")),
  dni: z.string().optional(),
  departmentId: z.string().optional(),
  provinceId: z.string().optional(),
  districtCode: z.string().optional(),
  departmentName: z.string().optional(),
  provinceName: z.string().optional(),
  districtName: z.string().optional(),
  address: z.string().min(5).max(300),
  notes: z.string().max(500).optional(),
  // Cart mode (multiple items)
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().min(1),
  })).optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/validations.ts
git commit -m "feat: add COD form settings and COD order Zod schemas"
```

---

## Task 4: createCodOrder server action

**Files:**
- Create: `actions/cod-orders.ts`

- [ ] **Step 1: Create the server action**

```typescript
// actions/cod-orders.ts
"use server";

import { prisma } from "@/lib/db";
import { createCodOrderSchema } from "@/lib/validations";

interface CodOrderInput {
  productId?: string;
  variantId?: string;
  quantity?: number;
  name: string;
  phone: string;
  email?: string;
  dni?: string;
  departmentId?: string;
  provinceId?: string;
  districtCode?: string;
  departmentName?: string;
  provinceName?: string;
  districtName?: string;
  address: string;
  notes?: string;
  items?: { productId: string; variantId?: string; quantity: number }[];
}

export async function createCodOrder(rawData: unknown) {
  const parsed = createCodOrderSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: "Datos del formulario inválidos" };
  }

  const data = parsed.data;

  // Normalize items list (single product or cart)
  const itemList = data.items ?? [
    { productId: data.productId!, variantId: data.variantId, quantity: data.quantity ?? 1 },
  ];

  // Fetch authoritative prices
  let subtotal = 0;
  const resolvedItems: { productId: string; variantId?: string; quantity: number; price: number; name: string }[] = [];

  for (const item of itemList) {
    if (item.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        select: { price: true, stock: true, product: { select: { name: true, id: true } } },
      });
      if (!variant) return { success: false, error: "Producto no encontrado" };
      if (variant.stock < item.quantity) return { success: false, error: "Stock insuficiente" };
      const price = Number(variant.price);
      subtotal += price * item.quantity;
      resolvedItems.push({ ...item, price, name: variant.product.name });
    } else {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { basePrice: true, stock: true, name: true },
      });
      if (!product) return { success: false, error: "Producto no encontrado" };
      if (product.stock < item.quantity) return { success: false, error: "Stock insuficiente" };
      const price = Number(product.basePrice);
      subtotal += price * item.quantity;
      resolvedItems.push({ ...item, price, name: product.name });
    }
  }

  const order = await prisma.order.create({
    data: {
      customerName: data.name,
      customerEmail: data.email || `cod-${Date.now()}@noemail.com`,
      customerPhone: data.phone,
      customerDni: data.dni,
      address: data.address,
      departmentId: data.departmentId,
      provinceId: data.provinceId,
      districtCode: data.districtCode,
      departmentName: data.departmentName,
      provinceName: data.provinceName,
      districtName: data.districtName,
      customerNotes: data.notes,
      subtotal,
      shippingCost: 0,
      discount: 0,
      total: subtotal,
      paymentMethod: "COD",
      status: "PENDING",
      orderItems: {
        create: resolvedItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          productName: item.name,
        })),
      },
    },
  });

  return { success: true, orderId: order.id };
}
```

- [ ] **Step 2: Check Order model fields match**

Run `npx prisma studio` and verify the `Order` model has `customerPhone`, `paymentMethod`, `status`, `orderItems` — these exist in the current schema. If `paymentMethod` doesn't include `"COD"`, check the enum and add it:

```bash
grep -n "COD\|paymentMethod\|PaymentMethod" "d:/PROYECTOS/Sistema ecommerce/shopgood-pe/prisma/schema.prisma"
```

If `COD` is not in the `PaymentMethod` enum, add it and run:

```bash
npx prisma migrate dev --name add_cod_payment_method
```

- [ ] **Step 3: Commit**

```bash
git add actions/cod-orders.ts
git commit -m "feat: add createCodOrder server action"
```

---

## Task 5: Admin — CodFormConfig component

**Files:**
- Create: `components/admin/CodFormConfig.tsx`

- [ ] **Step 1: Create the config panel**

```typescript
// components/admin/CodFormConfig.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CodFormSettings, CodFormField } from "@/lib/types/cod-form";

function SortableField({
  field, onChange,
}: { field: CodFormField; onChange: (f: CodFormField) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border text-sm">
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="flex-1 font-medium">{field.label}</span>
      <button
        type="button"
        onClick={() => onChange({ ...field, required: !field.required })}
        className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
          field.required ? "bg-green-100 text-green-700 border-green-300" : "bg-muted text-muted-foreground"
        }`}
      >
        {field.required ? "Requerido" : "Opcional"}
      </button>
      <button type="button" onClick={() => onChange({ ...field, visible: !field.visible })} className="text-muted-foreground hover:text-foreground">
        {field.visible ? <Eye className="h-4 w-4 text-blue-500" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

interface CodFormConfigProps {
  settings: CodFormSettings;
  onChange: (settings: CodFormSettings) => void;
}

export default function CodFormConfig({ settings, onChange }: CodFormConfigProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  const update = <K extends keyof CodFormSettings>(key: K, value: CodFormSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const updateField = (id: string, updated: CodFormField) =>
    onChange({ ...settings, fields: settings.fields.map((f) => (f.id === id ? updated : f)) });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = settings.fields.findIndex((f) => f.id === active.id);
    const newIndex = settings.fields.findIndex((f) => f.id === over.id);
    onChange({ ...settings, fields: arrayMove(settings.fields, oldIndex, newIndex) });
  };

  return (
    <div className="space-y-5 mt-4 border rounded-lg p-4 bg-muted/20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Título del formulario</Label>
          <Input value={settings.formTitle} onChange={(e) => update("formTitle", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Subtítulo</Label>
          <Input value={settings.formSubtitle ?? ""} onChange={(e) => update("formSubtitle", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Texto del botón</Label>
          <Input value={settings.buttonText} onChange={(e) => update("buttonText", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Badge de pago</Label>
          <Input value={settings.paymentBadge ?? ""} onChange={(e) => update("paymentBadge", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Título de agradecimiento</Label>
          <Input value={settings.thankYouTitle} onChange={(e) => update("thankYouTitle", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Mensaje de agradecimiento</Label>
          <Textarea value={settings.thankYouMessage} onChange={(e) => update("thankYouMessage", e.target.value)} rows={2} />
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Campos del formulario</Label>
        <p className="text-xs text-muted-foreground mb-2">Arrastra para reordenar • 👁 visible • 🚫 oculto</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={settings.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {settings.fields.map((field) => (
                <SortableField key={field.id} field={field} onChange={(f) => updateField(field.id, f)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="border rounded-lg p-3 bg-green-50 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-green-800">📱 Enviar a WhatsApp tras confirmar</Label>
          <Switch checked={settings.whatsappEnabled} onCheckedChange={(v) => update("whatsappEnabled", v)} />
        </div>
        {settings.whatsappEnabled && (
          <>
            <div>
              <Label className="text-xs">Número WhatsApp (con código país)</Label>
              <Input value={settings.whatsappNumber ?? ""} onChange={(e) => update("whatsappNumber", e.target.value)} placeholder="+51999999999" />
            </div>
            <div>
              <Label className="text-xs">Mensaje (variables: {"{nombre}"}, {"{telefono}"}, {"{direccion}"}, {"{total}"}, {"{producto}"})</Label>
              <Textarea value={settings.whatsappMessage ?? ""} onChange={(e) => update("whatsappMessage", e.target.value)} rows={4} className="text-xs font-mono" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/CodFormConfig.tsx
git commit -m "feat: add CodFormConfig admin component"
```

---

## Task 6: Integrate "Modo de Compra" into product forms

**Files:**
- Modify: `components/admin/EditProductForm.tsx`
- Modify: `components/admin/NewProductForm.tsx`

- [ ] **Step 1: Add imports to EditProductForm**

At the top of `components/admin/EditProductForm.tsx`, add:

```typescript
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CodFormConfig from "@/components/admin/CodFormConfig";
import { DEFAULT_COD_FORM_SETTINGS, type CodFormSettings } from "@/lib/types/cod-form";
```

- [ ] **Step 2: Add state for checkoutMode and codFormSettings in EditProductForm**

Inside the component, find the `formData` state and add two fields:

```typescript
checkoutMode: (product?.checkoutMode as string) || "STANDARD",
codFormSettings: (product?.codFormSettings as CodFormSettings) || DEFAULT_COD_FORM_SETTINGS,
```

- [ ] **Step 3: Add "Modo de Compra" card in EditProductForm**

Find the closing `</Card>` of the "Presentación" card. Immediately after it, add a new card:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Modo de Compra</CardTitle>
    <p className="text-sm text-muted-foreground">
      ¿Cómo puede comprar el cliente este producto?
    </p>
  </CardHeader>
  <CardContent className="space-y-3">
    <RadioGroup
      value={formData.checkoutMode}
      onValueChange={(v) => setFormData({ ...formData, checkoutMode: v })}
    >
      <div className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
        <RadioGroupItem value="STANDARD" id="cm-standard" />
        <label htmlFor="cm-standard" className="cursor-pointer">
          <div className="font-medium text-sm">Checkout normal</div>
          <div className="text-xs text-muted-foreground">Agrega al carrito → pago con tarjeta/Yape/Plin</div>
        </label>
      </div>
      <div className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
        <RadioGroupItem value="COD_AND_CART" id="cm-cod-cart" />
        <label htmlFor="cm-cod-cart" className="cursor-pointer">
          <div className="font-medium text-sm">Comprar ahora (COD) + Carrito</div>
          <div className="text-xs text-muted-foreground">Botón principal "Comprar ahora" COD. Botón secundario agrega al carrito.</div>
        </label>
      </div>
      <div className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
        <RadioGroupItem value="COD_ONLY" id="cm-cod-only" />
        <label htmlFor="cm-cod-only" className="cursor-pointer">
          <div className="font-medium text-sm">Solo contra entrega (sin carrito)</div>
          <div className="text-xs text-muted-foreground">Solo botón "Comprar ahora" COD. No se puede agregar al carrito.</div>
        </label>
      </div>
    </RadioGroup>

    {(formData.checkoutMode === "COD_ONLY" || formData.checkoutMode === "COD_AND_CART") && (
      <CodFormConfig
        settings={formData.codFormSettings as CodFormSettings}
        onChange={(s) => setFormData({ ...formData, codFormSettings: s })}
      />
    )}
  </CardContent>
</Card>
```

- [ ] **Step 4: Include checkoutMode and codFormSettings in the form submission**

Find where `formData` is sent in the update mutation (likely a `fetch` to `/api/admin/products/[productId]/update`). Ensure `checkoutMode` and `codFormSettings` are included in the request body.

- [ ] **Step 5: Repeat for NewProductForm**

In `components/admin/NewProductForm.tsx`, add the same imports, state fields (with STANDARD defaults), and the "Modo de Compra" card (same JSX as Step 3).

- [ ] **Step 6: Commit**

```bash
git add components/admin/EditProductForm.tsx components/admin/NewProductForm.tsx
git commit -m "feat: add Modo de Compra card to product admin forms"
```

---

## Task 7: Update product API route to accept new fields

**Files:**
- Modify: `app/api/admin/products/[productId]/update/route.ts`

- [ ] **Step 1: Check current update route schema**

```bash
grep -n "checkoutMode\|codFormSettings\|template" "d:/PROYECTOS/Sistema ecommerce/shopgood-pe/app/api/admin/products/[productId]/update/route.ts"
```

- [ ] **Step 2: Add fields to the update schema in the route**

In `lib/validations.ts`, find the `updateProductSchema`. Add to it:

```typescript
checkoutMode: z.enum(["STANDARD", "COD_ONLY", "COD_AND_CART"]).optional(),
codFormSettings: codFormSettingsSchema.optional().nullable(),
```

- [ ] **Step 3: Add fields to the Prisma update call in the route**

In the route's Prisma update, add:

```typescript
checkoutMode: validated.checkoutMode,
codFormSettings: validated.codFormSettings ?? undefined,
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/products/ lib/validations.ts
git commit -m "feat: accept checkoutMode and codFormSettings in product update API"
```

---

## Task 8: CodOrderModal component

**Files:**
- Create: `components/shop/CodOrderModal.tsx`

- [ ] **Step 1: Create the modal**

```typescript
// components/shop/CodOrderModal.tsx
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import LocationSelector from "@/components/shop/LocationSelector";
import { createCodOrder } from "@/actions/cod-orders";
import type { CodFormSettings } from "@/lib/types/cod-form";

interface CodOrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  name: string;
  price: number;
  image?: string;
}

interface CodOrderModalProps {
  open: boolean;
  onClose: () => void;
  items: CodOrderItem[];
  settings: CodFormSettings;
}

function buildWhatsAppUrl(settings: CodFormSettings, data: Record<string, string>, total: number): string {
  const msg = (settings.whatsappMessage ?? "")
    .replace("{nombre}", data.name ?? "")
    .replace("{telefono}", data.phone ?? "")
    .replace("{email}", data.email ?? "")
    .replace("{direccion}", data.address ?? "")
    .replace("{distrito}", data.districtName ?? "")
    .replace("{total}", total.toFixed(2))
    .replace("{producto}", data.productNames ?? "");
  return `https://wa.me/${(settings.whatsappNumber ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
}

export default function CodOrderModal({ open, onClose, items, settings }: CodOrderModalProps) {
  const [step, setStep] = useState<"form" | "thanks">("form");
  const [isPending, startTransition] = useTransition();
  const [location, setLocation] = useState({
    departmentId: "", provinceId: "", districtCode: "",
    departmentName: "", provinceName: "", districtName: "",
  });
  const [formData, setFormData] = useState<Record<string, string>>({});
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const visibleFields = settings.fields.filter((f) => f.visible);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const field of visibleFields) {
      if (field.required && !formData[field.id] && field.id !== "location") {
        toast.error(`El campo "${field.label}" es requerido`);
        return;
      }
    }
    if (visibleFields.find((f) => f.id === "location" && f.required) && !location.districtCode) {
      toast.error("Selecciona tu distrito");
      return;
    }

    startTransition(async () => {
      const payload = {
        items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        name: formData.name ?? "",
        phone: formData.phone ?? "",
        email: formData.email,
        dni: formData.dni,
        address: formData.address ?? "",
        notes: formData.notes,
        ...location,
      };
      const result = await createCodOrder(payload);
      if (result.success) {
        if (settings.whatsappEnabled && settings.whatsappNumber) {
          window.open(
            buildWhatsAppUrl(settings, { ...formData, ...location, productNames: items.map((i) => i.name).join(", ") }, total),
            "_blank"
          );
        }
        setStep("thanks");
      } else {
        toast.error(result.error ?? "Error al crear el pedido");
      }
    });
  };

  const handleClose = () => { setStep("form"); setFormData({}); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>{settings.formTitle}</DialogTitle>
              {settings.formSubtitle && <p className="text-sm text-muted-foreground">{settings.formSubtitle}</p>}
            </DialogHeader>

            {/* Order summary */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
              {items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span className="font-semibold">S/ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1 border-t text-sm">
                <span>Total</span>
                <span className="text-red-600">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {visibleFields.map((field) => {
                if (field.id === "location") {
                  return (
                    <div key="location">
                      <Label className="text-sm">{field.label}{field.required && " *"}</Label>
                      <LocationSelector value={location} onChange={setLocation} />
                    </div>
                  );
                }
                if (field.id === "notes") {
                  return (
                    <div key="notes">
                      <Label className="text-sm">{field.label}{field.required && " *"}</Label>
                      <Textarea
                        value={formData.notes ?? ""}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                        required={field.required}
                      />
                    </div>
                  );
                }
                return (
                  <div key={field.id}>
                    <Label className="text-sm">{field.label}{field.required && " *"}</Label>
                    <Input
                      type={field.id === "email" ? "email" : field.id === "phone" ? "tel" : "text"}
                      value={formData[field.id] ?? ""}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      required={field.required}
                    />
                  </div>
                );
              })}

              {settings.paymentBadge && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-sm text-green-800">
                  {settings.paymentBadge}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {isPending ? "Procesando..." : settings.buttonText}
              </button>
              <p className="text-center text-xs text-muted-foreground">🔒 Datos seguros • Sin tarjeta requerida</p>
            </form>
          </>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-bold">{settings.thankYouTitle}</h2>
            <p className="text-muted-foreground text-sm">{settings.thankYouMessage}</p>
            <button onClick={handleClose} className="mt-4 px-6 py-2 border rounded-lg text-sm hover:bg-muted transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

> **Note:** `LocationSelector` is an existing component at `components/shop/LocationSelector.tsx`. Check it exists and accepts `value` / `onChange` props in the same shape used above. Adjust the interface if needed.

- [ ] **Step 2: Commit**

```bash
git add components/shop/CodOrderModal.tsx
git commit -m "feat: add CodOrderModal floating form component"
```

---

## Task 9: ProductActions — checkout-mode-aware buttons

**Files:**
- Modify: `components/shop/ProductActions.tsx` (or `AddToCartButton.tsx` — check which exists)

- [ ] **Step 1: Check current file**

```bash
ls "d:/PROYECTOS/Sistema ecommerce/shopgood-pe/components/shop/"
```

If `ProductActions.tsx` exists, modify it. Otherwise modify `AddToCartButton.tsx`.

- [ ] **Step 2: Add COD button logic**

Find the component and add `checkoutMode` and `codFormSettings` to its props. Then wrap the existing "Agregar al carrito" button with checkout mode logic:

```typescript
// Add to imports
import { useState } from "react";
import CodOrderModal from "@/components/shop/CodOrderModal";
import type { CheckoutMode, CodFormSettings } from "@/lib/types/cod-form";
import { DEFAULT_COD_FORM_SETTINGS } from "@/lib/types/cod-form";
```

Add to the component props interface:
```typescript
checkoutMode?: CheckoutMode;
codFormSettings?: CodFormSettings | null;
```

Inside the component, add state and compute the item for the modal:
```typescript
const [codOpen, setCodOpen] = useState(false);
const mode = checkoutMode ?? "STANDARD";
const codSettings = (codFormSettings as CodFormSettings) ?? DEFAULT_COD_FORM_SETTINGS;

const codItem = {
  productId: product.id,
  variantId: selectedVariant?.id,
  quantity: 1,
  name: product.name,
  price: selectedVariant ? Number(selectedVariant.price) : Number(product.basePrice),
  image: Array.isArray(product.images) ? product.images[0] : undefined,
};
```

Replace the existing "Agregar al carrito" button section with:

```tsx
<div className="space-y-2">
  {/* COD primary button */}
  {(mode === "COD_ONLY" || mode === "COD_AND_CART") && (
    <button
      onClick={() => setCodOpen(true)}
      disabled={!inStock}
      className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-base"
    >
      🛒 Comprar ahora
    </button>
  )}

  {/* Standard cart button */}
  {(mode === "STANDARD" || mode === "COD_AND_CART") && (
    <button
      onClick={handleAddToCart}
      disabled={!inStock}
      className={`w-full font-semibold py-3 rounded-xl transition-colors text-base ${
        mode === "COD_AND_CART"
          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm py-2"
          : "bg-primary hover:bg-primary/90 text-primary-foreground"
      }`}
    >
      {mode === "COD_AND_CART" ? "Agregar al carrito" : "Agregar al carrito"}
    </button>
  )}
</div>

<CodOrderModal
  open={codOpen}
  onClose={() => setCodOpen(false)}
  items={[codItem]}
  settings={codSettings}
/>
```

- [ ] **Step 3: Pass new props from product pages**

In `app/(shop)/productos/[slug]/page.tsx`, include `checkoutMode` and `codFormSettings` in `serializedProduct` and pass them down to the template views, which pass to `ProductActions`.

In the serializedProduct block (around line 67), add:

```typescript
checkoutMode: product.checkoutMode,
codFormSettings: product.codFormSettings,
```

- [ ] **Step 4: Commit**

```bash
git add components/shop/ProductActions.tsx app/(shop)/productos/
git commit -m "feat: make ProductActions checkout-mode-aware with COD button"
```

---

## Task 10: Cart store — prevent COD_ONLY from being added

**Files:**
- Modify: `store/cart.ts`

- [ ] **Step 1: Add guard in addItem**

In `store/cart.ts`, find the `addItem` function. It currently accepts a cart item directly without knowing `checkoutMode`. The guard must be applied at the call site (in `ProductActions`) rather than the store, since the store doesn't know product details.

In `components/shop/ProductActions.tsx` (or `AddToCartButton.tsx`), in the `handleAddToCart` function, add at the top:

```typescript
if (mode === "COD_ONLY") {
  toast.error("Este producto solo está disponible con pago contra entrega");
  return;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/shop/ProductActions.tsx store/cart.ts
git commit -m "feat: prevent COD_ONLY products from being added to cart"
```

---

## Task 11: Cart page — COD button

**Files:**
- Modify: `app/(checkout)/carrito/page.tsx`

- [ ] **Step 1: Find the cart page and checkout button area**

```bash
grep -n "checkout\|carrito\|Proceder\|button" "d:/PROYECTOS/Sistema ecommerce/shopgood-pe/app/(checkout)/carrito/page.tsx" | head -30
```

- [ ] **Step 2: Add COD button below the main checkout button**

The cart page uses the Zustand cart store. The items in the cart have `productId`. The cart page needs to know which items have COD enabled. The simplest approach: fetch product `checkoutMode` for items in the cart when the cart page loads.

In the cart page (Server Component), after fetching products for the cart, check if any have COD enabled:

```typescript
// After getting cart items from the page
const productIds = cartItems.map(item => item.productId);
const products = await prisma.product.findMany({
  where: { id: { in: productIds } },
  select: { id: true, checkoutMode: true, codFormSettings: true },
});
const hasCodProducts = products.some(
  p => p.checkoutMode === "COD_ONLY" || p.checkoutMode === "COD_AND_CART"
);
```

Pass `hasCodProducts` and the COD settings to the client component. In the client component, after the "Ir al checkout" button, add:

```tsx
{hasCodProducts && (
  <>
    <button
      onClick={() => setCodCartOpen(true)}
      className="w-full py-3 border-2 border-red-600 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors text-sm"
    >
      🛒 Pedir con pago contra entrega
    </button>
    <p className="text-xs text-center text-muted-foreground">El pago contra entrega aplica a todos los productos del carrito</p>
  </>
)}

<CodOrderModal
  open={codCartOpen}
  onClose={() => setCodCartOpen(false)}
  items={codCartItems}
  settings={cartCodSettings}
/>
```

Where `codCartItems` is built from the cart items mapped to `CodOrderItem` shape, and `cartCodSettings` uses the default or first COD product's settings.

- [ ] **Step 3: Commit**

```bash
git add "app/(checkout)/carrito/"
git commit -m "feat: add COD button to cart page"
```

---

## Task 12: Final build and smoke test

- [ ] **Step 1: Build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -30
```

Expected: build passes with no errors.

- [ ] **Step 2: Manual end-to-end test**

1. In admin, edit a product → set "Modo de Compra" to "COD_AND_CART" → configure texts and WhatsApp → save
2. Visit product page → verify "Comprar ahora" (red, primary) and "Agregar al carrito" (secondary) both appear
3. Click "Comprar ahora" → modal opens with configured title and fields
4. Fill form → submit → thank you screen appears → WhatsApp opens in new tab (if enabled)
5. Edit another product → set "COD_ONLY" → save → visit page → verify only "Comprar ahora" appears
6. Try adding a COD_ONLY product to cart (via URL manipulation) → verify it's blocked
7. Add a COD_AND_CART product to cart → visit `/carrito` → verify "Pedir con pago contra entrega" button appears
8. Check admin orders panel → verify COD order appears with `paymentMethod: COD`

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: COD quick order form smoke test fixes"
```
