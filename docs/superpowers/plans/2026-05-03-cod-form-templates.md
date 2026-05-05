# COD Form Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract `Product.codFormSettings` (Json) into a standalone `CodFormTemplate` entity that is reusable across products, with a page-builder editor (drag-and-drop typed blocks, instant client-side preview, rich submit-button customization, and post-submit action selection). Move `shippingRestriction` to `Product` so it applies to both COD and standard checkout.

**Architecture:** New top-level `CodFormTemplate` Prisma model with a child `CodFormBlock` collection (15 typed blocks). `Product.codFormTemplateId` FK + `Product.shippingRestriction` Json. Admin CRUD at `/admin/formularios-cod` with a split-screen editor; storefront uses the same `CodFormBlockRenderer` as the admin preview (single source of truth). Expand-contract migration: ship new system first, drop `Product.codFormSettings` in a separate post-deploy PR. No data preservation needed (no production rows have `codFormSettings`).

**Tech Stack:** Next.js 16 App Router · Prisma 6 (PostgreSQL/Neon) · TypeScript · Zod 4 · Radix Dialog/Popover · Tailwind v4 · Zustand 5 · `@dnd-kit` · `lucide-react` · existing `BulkEditModal` pattern.

**Source spec:** [docs/superpowers/specs/2026-05-03-cod-form-templates-design.md](../specs/2026-05-03-cod-form-templates-design.md)

**Project conventions:**
- No automated tests in this repo. Verification = `npm run build` (type-check) + manual smoke testing.
- Spanish for routes / UI strings; English for identifiers and commit messages.
- No emojis in code or UI (use `lucide-react` icons).
- Mutations: server actions for admin/internal; API routes only for public/external.
- Validate at every boundary with Zod.

---

## File Structure

### New files

```
prisma/migrations/<ts>_add_cod_form_templates/migration.sql
prisma/migrations/<ts>_drop_product_cod_form_settings/migration.sql   # phase 11
lib/cod-forms/types.ts
lib/cod-forms/defaults.ts
lib/cod-forms/schema.ts
lib/cod-forms/template-variables.ts
lib/products/shipping-restriction.ts
actions/cod-form-templates.ts
scripts/setup-cod-forms-permissions.ts
scripts/seed-cod-form-default.ts
app/admin/formularios-cod/page.tsx
app/admin/formularios-cod/[id]/page.tsx
components/admin/cod-forms/CodFormTemplatesList.tsx
components/admin/cod-forms/CodFormEditor.tsx
components/admin/cod-forms/EditorToolbar.tsx
components/admin/cod-forms/PostSubmitActionPopover.tsx
components/admin/cod-forms/ButtonStyleEditor.tsx
components/admin/cod-forms/BlocksList.tsx
components/admin/cod-forms/SortableBlockItem.tsx
components/admin/cod-forms/AddBlockSelector.tsx
components/admin/cod-forms/BlockEditPanel.tsx
components/admin/cod-forms/AssignedProductsTab.tsx
components/admin/cod-forms/AssignProductsModal.tsx
components/admin/cod-forms/PreviewPanel.tsx
components/admin/cod-forms/store.ts
components/admin/products/ShippingRestrictionCard.tsx
components/admin/products/CodFormTemplateCard.tsx
components/shop/cod-form/CodFormBlockRenderer.tsx
components/shop/cod-form/blocks/HeaderBlock.tsx
components/shop/cod-form/blocks/CartItemsBlock.tsx
components/shop/cod-form/blocks/ShippingOptionsBlock.tsx
components/shop/cod-form/blocks/OrderSummaryBlock.tsx
components/shop/cod-form/blocks/SubmitButtonBlock.tsx
components/shop/cod-form/blocks/FieldBlock.tsx
components/shop/cod-form/PostSubmitView.tsx
```

### Modified files

```
prisma/schema.prisma
lib/permissions.ts
lib/validations.ts
lib/types/cod-form.ts
app/admin/layout.tsx
app/(shop)/productos/[slug]/page.tsx
app/api/admin/products/create/route.ts
app/api/admin/products/[productId]/update/route.ts
actions/cod-orders.ts
actions/orders.ts
actions/products-import.ts
components/admin/EditProductForm.tsx
components/admin/NewProductForm.tsx
components/admin/BulkEditModal.tsx
components/shop/CodOrderModal.tsx
components/shop/ProductActions.tsx
components/shop/templates/ProductLandingView.tsx
components/shop/templates/ProductStandardView.tsx
```

### Deleted files (phase 11)

```
components/admin/CodFormConfig.tsx
```

---

## Phase 1 — Modelo de datos y tipos base

### Task 1: Add Prisma schema for CodFormTemplate + CodFormBlock + Product changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the two new enums right after the existing `CheckoutMode` enum**

Locate `enum CheckoutMode` in `prisma/schema.prisma` and append below it:

```prisma
enum CodFormBlockType {
  HEADER
  CART_ITEMS
  SHIPPING_OPTIONS
  ORDER_SUMMARY
  SUBMIT_BUTTON
  FIELD_NAME
  FIELD_PHONE
  FIELD_EMAIL
  FIELD_DNI
  FIELD_ADDRESS
  FIELD_ADDRESS_2
  FIELD_PROVINCE
  FIELD_CITY
  FIELD_REFERENCE
  FIELD_NOTES
}

enum PostSubmitAction {
  INLINE_THANK_YOU
  WHATSAPP_REDIRECT
  THANK_YOU_PAGE
}
```

- [ ] **Step 2: Add the two new models right before `model Page` (around line 1072)**

```prisma
model CodFormTemplate {
  id               String           @id @default(cuid())
  name             String           @unique
  isDefault        Boolean          @default(false)

  buttonText       String           @default("Realizar Pedido y Pagar al Recibir")
  buttonStyle      Json             @default("{}")

  postSubmitAction PostSubmitAction @default(INLINE_THANK_YOU)
  thankYouTitle    String?
  thankYouMessage  String?          @db.Text
  whatsappNumber   String?
  whatsappMessage  String?          @db.Text
  thankYouPageId   String?
  thankYouPage     Page?            @relation("CodFormThankYouPage", fields: [thankYouPageId], references: [id], onDelete: SetNull)

  blocks           CodFormBlock[]
  products         Product[]

  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([isDefault])
  @@index([thankYouPageId])
}

model CodFormBlock {
  id         String           @id @default(cuid())
  templateId String
  template   CodFormTemplate  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  position   Int
  type       CodFormBlockType
  content    Json             @default("{}")
  visible    Boolean          @default(true)
  required   Boolean          @default(false)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  @@index([templateId, position])
}
```

- [ ] **Step 3: Add new fields and relation to `model Product` (around line 130, after `sizeGuide`)**

Insert these lines after the `sizeGuide` relation:

```prisma
  codFormTemplateId   String?
  codFormTemplate     CodFormTemplate? @relation(fields: [codFormTemplateId], references: [id], onDelete: SetNull)
  shippingRestriction Json?
```

And add to the existing `@@index` block at the bottom of `Product`:

```prisma
  @@index([codFormTemplateId])
```

(Leave `codFormSettings Json?` in place — it gets dropped in Phase 11.)

- [ ] **Step 4: Add the inverse relation in `model Page` (around line 1100)**

Right after `themesUsingAsCart Theme[] @relation("ThemeCartPage")` (or wherever the existing theme relations end), add:

```prisma
  /** CodFormTemplates that point to this page as their thank-you destination. */
  codFormTemplates Page @relation("CodFormThankYouPage")
```

Wait — Prisma requires the inverse to use the same relation name and type `CodFormTemplate[]`. Use this instead:

```prisma
  /** CodFormTemplates that point to this page as their thank-you destination. */
  codFormTemplates CodFormTemplate[] @relation("CodFormThankYouPage")
```

- [ ] **Step 5: Generate the migration**

Run:
```
npx prisma migrate dev --name add_cod_form_templates
```

Expected: a new file under `prisma/migrations/<ts>_add_cod_form_templates/migration.sql` with `CREATE TYPE`, `CREATE TABLE`, and `ALTER TABLE Product` statements. Prisma client regenerates automatically.

- [ ] **Step 6: Verify build**

Run:
```
npm run build
```

Expected: PASS. Type-check sees the new Prisma types.

- [ ] **Step 7: Commit**

```
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(cod-forms): prisma schema for CodFormTemplate + CodFormBlock"
```

---

### Task 2: Define shared TypeScript types in `lib/cod-forms/types.ts`

**Files:**
- Create: `lib/cod-forms/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/cod-forms/types.ts
import type { CodFormBlockType, PostSubmitAction } from "@prisma/client"

export type { CodFormBlockType, PostSubmitAction }

export type ButtonStyle = {
  textColor: string
  fontSize: number
  fontWeight: "normal" | "bold"
  fontStyle: "normal" | "italic"
  bgColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  shadow: number          // 0-10
  animation: "none" | "pulse" | "shake" | "bounce"
  icon: string | null     // lucide-react icon name
  subtitle: string | null
}

export type HeaderContent = {
  text: string
  align: "left" | "center" | "right"
  fontSize: number
  fontWeight: "normal" | "bold"
  fontStyle: "normal" | "italic"
  color: string
}

export type FieldContent = {
  label: string
  placeholder: string
  errorMessage: string
  hideLabel: boolean
}

export type CartItemsContent = {
  showThumbnail: boolean
  showVariant: boolean
  showQuantitySelector: boolean
}

export type ShippingOptionsContent = {
  showFreeShipping: boolean
}

export type OrderSummaryContent = {
  showSubtotal: boolean
  showDiscount: boolean
  showShipping: boolean
  showTotal: boolean
}

export type SubmitButtonContent = Record<string, never>

export type BlockContent =
  | { type: "HEADER"; content: HeaderContent }
  | { type: "CART_ITEMS"; content: CartItemsContent }
  | { type: "SHIPPING_OPTIONS"; content: ShippingOptionsContent }
  | { type: "ORDER_SUMMARY"; content: OrderSummaryContent }
  | { type: "SUBMIT_BUTTON"; content: SubmitButtonContent }
  | { type: `FIELD_${string}`; content: FieldContent }

export type CodFormBlock = {
  id: string
  position: number
  type: CodFormBlockType
  content: Record<string, unknown>
  visible: boolean
  required: boolean
}

export type CodFormTemplateData = {
  id: string
  name: string
  isDefault: boolean
  buttonText: string
  buttonStyle: ButtonStyle
  postSubmitAction: PostSubmitAction
  thankYouTitle: string | null
  thankYouMessage: string | null
  whatsappNumber: string | null
  whatsappMessage: string | null
  thankYouPageId: string | null
  thankYouPageSlug: string | null
  blocks: CodFormBlock[]
}

export type ShippingRestriction = {
  enabled: boolean
  allowedDepartmentIds: string[]
  allowedProvinceIds: string[]
  allowedDistrictCodes: string[]
  restrictionMessage: string | null
}

export const FIELD_BLOCK_TYPES: CodFormBlockType[] = [
  "FIELD_NAME",
  "FIELD_PHONE",
  "FIELD_EMAIL",
  "FIELD_DNI",
  "FIELD_ADDRESS",
  "FIELD_ADDRESS_2",
  "FIELD_PROVINCE",
  "FIELD_CITY",
  "FIELD_REFERENCE",
  "FIELD_NOTES",
]

export const STRUCTURAL_BLOCK_TYPES: CodFormBlockType[] = [
  "HEADER",
  "CART_ITEMS",
  "SHIPPING_OPTIONS",
  "ORDER_SUMMARY",
  "SUBMIT_BUTTON",
]

export const SINGLETON_BLOCK_TYPES: CodFormBlockType[] = [
  "CART_ITEMS",
  "SHIPPING_OPTIONS",
  "ORDER_SUMMARY",
  "SUBMIT_BUTTON",
]
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add lib/cod-forms/types.ts
git commit -m "feat(cod-forms): shared types for templates and blocks"
```

---

### Task 3: Define defaults in `lib/cod-forms/defaults.ts`

**Files:**
- Create: `lib/cod-forms/defaults.ts`

- [ ] **Step 1: Create the defaults file**

```typescript
// lib/cod-forms/defaults.ts
import type {
  ButtonStyle,
  CodFormBlockType,
  HeaderContent,
  FieldContent,
  CartItemsContent,
  ShippingOptionsContent,
  OrderSummaryContent,
  SubmitButtonContent,
} from "./types"

export const DEFAULT_BUTTON_STYLE: ButtonStyle = {
  textColor: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
  fontStyle: "normal",
  bgColor: "#000000",
  borderColor: "#000000",
  borderWidth: 0,
  borderRadius: 8,
  shadow: 0,
  animation: "none",
  icon: null,
  subtitle: null,
}

export const DEFAULT_HEADER_CONTENT: HeaderContent = {
  text: "Favor ingresar tus datos para realizar el pedido",
  align: "left",
  fontSize: 18,
  fontWeight: "bold",
  fontStyle: "normal",
  color: "#000000",
}

export const DEFAULT_CART_ITEMS_CONTENT: CartItemsContent = {
  showThumbnail: true,
  showVariant: true,
  showQuantitySelector: true,
}

export const DEFAULT_SHIPPING_OPTIONS_CONTENT: ShippingOptionsContent = {
  showFreeShipping: true,
}

export const DEFAULT_ORDER_SUMMARY_CONTENT: OrderSummaryContent = {
  showSubtotal: true,
  showDiscount: true,
  showShipping: true,
  showTotal: true,
}

export const DEFAULT_SUBMIT_BUTTON_CONTENT: SubmitButtonContent = {}

const FIELD_DEFAULTS: Record<string, FieldContent> = {
  FIELD_NAME: {
    label: "Nombre completo",
    placeholder: "Ej: Juan Pérez",
    errorMessage: "Ingresa tu nombre",
    hideLabel: false,
  },
  FIELD_PHONE: {
    label: "Celular con WhatsApp",
    placeholder: "Ej: 999 999 999",
    errorMessage: "Ingresa tu número",
    hideLabel: false,
  },
  FIELD_EMAIL: {
    label: "Correo electrónico",
    placeholder: "tu@correo.com",
    errorMessage: "Ingresa un correo válido",
    hideLabel: false,
  },
  FIELD_DNI: {
    label: "DNI",
    placeholder: "Ej: 12345678",
    errorMessage: "Ingresa tu DNI",
    hideLabel: false,
  },
  FIELD_ADDRESS: {
    label: "Dirección de entrega",
    placeholder: "Av. Arequipa 123, Dpto 402",
    errorMessage: "Ingresa la dirección",
    hideLabel: false,
  },
  FIELD_ADDRESS_2: {
    label: "Dirección 2",
    placeholder: "Departamento, oficina, etc.",
    errorMessage: "",
    hideLabel: false,
  },
  FIELD_PROVINCE: {
    label: "Provincia",
    placeholder: "Selecciona tu provincia",
    errorMessage: "Selecciona una provincia",
    hideLabel: false,
  },
  FIELD_CITY: {
    label: "Distrito",
    placeholder: "Selecciona tu distrito",
    errorMessage: "Selecciona un distrito",
    hideLabel: false,
  },
  FIELD_REFERENCE: {
    label: "Referencias de la dirección",
    placeholder: "Entre las calles X e Y, frente a...",
    errorMessage: "",
    hideLabel: false,
  },
  FIELD_NOTES: {
    label: "Notas adicionales",
    placeholder: "Comentarios para la entrega",
    errorMessage: "",
    hideLabel: false,
  },
}

export function getDefaultContentForType(
  type: CodFormBlockType,
): Record<string, unknown> {
  if (type === "HEADER") return { ...DEFAULT_HEADER_CONTENT }
  if (type === "CART_ITEMS") return { ...DEFAULT_CART_ITEMS_CONTENT }
  if (type === "SHIPPING_OPTIONS") return { ...DEFAULT_SHIPPING_OPTIONS_CONTENT }
  if (type === "ORDER_SUMMARY") return { ...DEFAULT_ORDER_SUMMARY_CONTENT }
  if (type === "SUBMIT_BUTTON") return { ...DEFAULT_SUBMIT_BUTTON_CONTENT }
  return { ...FIELD_DEFAULTS[type] }
}

export const DEFAULT_TEMPLATE_NAME = "Default"

// Order matters — this is what `seed-cod-form-default.ts` inserts into
// CodFormBlock when creating the Default template.
export const DEFAULT_TEMPLATE_BLOCKS: Array<{
  type: CodFormBlockType
  visible: boolean
  required: boolean
}> = [
  { type: "HEADER", visible: true, required: false },
  { type: "CART_ITEMS", visible: true, required: false },
  { type: "SHIPPING_OPTIONS", visible: true, required: false },
  { type: "ORDER_SUMMARY", visible: true, required: false },
  { type: "FIELD_NAME", visible: true, required: true },
  { type: "FIELD_PHONE", visible: true, required: true },
  { type: "FIELD_ADDRESS", visible: true, required: true },
  { type: "FIELD_REFERENCE", visible: true, required: false },
  { type: "SUBMIT_BUTTON", visible: true, required: false },
]
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add lib/cod-forms/defaults.ts
git commit -m "feat(cod-forms): default content factories per block type"
```

---

### Task 4: Add Zod schemas in `lib/cod-forms/schema.ts`

**Files:**
- Create: `lib/cod-forms/schema.ts`

- [ ] **Step 1: Create the schema file**

```typescript
// lib/cod-forms/schema.ts
import { z } from "zod"

export const buttonStyleSchema = z.object({
  textColor: z.string(),
  fontSize: z.number().int().min(8).max(72),
  fontWeight: z.enum(["normal", "bold"]),
  fontStyle: z.enum(["normal", "italic"]),
  bgColor: z.string(),
  borderColor: z.string(),
  borderWidth: z.number().int().min(0).max(20),
  borderRadius: z.number().int().min(0).max(100),
  shadow: z.number().int().min(0).max(10),
  animation: z.enum(["none", "pulse", "shake", "bounce"]),
  icon: z.string().nullable(),
  subtitle: z.string().nullable(),
})

const headerContentSchema = z.object({
  text: z.string(),
  align: z.enum(["left", "center", "right"]),
  fontSize: z.number().int().min(8).max(72),
  fontWeight: z.enum(["normal", "bold"]),
  fontStyle: z.enum(["normal", "italic"]),
  color: z.string(),
})

const fieldContentSchema = z.object({
  label: z.string(),
  placeholder: z.string(),
  errorMessage: z.string(),
  hideLabel: z.boolean(),
})

const cartItemsContentSchema = z.object({
  showThumbnail: z.boolean(),
  showVariant: z.boolean(),
  showQuantitySelector: z.boolean(),
})

const shippingOptionsContentSchema = z.object({
  showFreeShipping: z.boolean(),
})

const orderSummaryContentSchema = z.object({
  showSubtotal: z.boolean(),
  showDiscount: z.boolean(),
  showShipping: z.boolean(),
  showTotal: z.boolean(),
})

export const blockTypeSchema = z.enum([
  "HEADER",
  "CART_ITEMS",
  "SHIPPING_OPTIONS",
  "ORDER_SUMMARY",
  "SUBMIT_BUTTON",
  "FIELD_NAME",
  "FIELD_PHONE",
  "FIELD_EMAIL",
  "FIELD_DNI",
  "FIELD_ADDRESS",
  "FIELD_ADDRESS_2",
  "FIELD_PROVINCE",
  "FIELD_CITY",
  "FIELD_REFERENCE",
  "FIELD_NOTES",
])

// Validates `content` shape based on `type`. Used inside `blockSchema`.
const blockContentByType = z.discriminatedUnion("type", [
  z.object({ type: z.literal("HEADER"), content: headerContentSchema }),
  z.object({ type: z.literal("CART_ITEMS"), content: cartItemsContentSchema }),
  z.object({ type: z.literal("SHIPPING_OPTIONS"), content: shippingOptionsContentSchema }),
  z.object({ type: z.literal("ORDER_SUMMARY"), content: orderSummaryContentSchema }),
  z.object({ type: z.literal("SUBMIT_BUTTON"), content: z.object({}) }),
  z.object({ type: z.literal("FIELD_NAME"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_PHONE"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_EMAIL"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_DNI"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_ADDRESS"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_ADDRESS_2"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_PROVINCE"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_CITY"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_REFERENCE"), content: fieldContentSchema }),
  z.object({ type: z.literal("FIELD_NOTES"), content: fieldContentSchema }),
])

export const blockSchema = z.object({
  id: z.string().optional(),
  position: z.number().int().min(0),
  type: blockTypeSchema,
  content: z.record(z.string(), z.unknown()),
  visible: z.boolean(),
  required: z.boolean(),
})

export const postSubmitActionSchema = z.enum([
  "INLINE_THANK_YOU",
  "WHATSAPP_REDIRECT",
  "THANK_YOU_PAGE",
])

export const templateUpdateSchema = z.object({
  name: z.string().min(1).max(80),
  buttonText: z.string().min(1).max(120),
  buttonStyle: buttonStyleSchema,
  postSubmitAction: postSubmitActionSchema,
  thankYouTitle: z.string().nullable(),
  thankYouMessage: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  whatsappMessage: z.string().nullable(),
  thankYouPageId: z.string().nullable(),
  blocks: z.array(blockSchema),
}).superRefine((tpl, ctx) => {
  if (tpl.postSubmitAction === "WHATSAPP_REDIRECT" && !tpl.whatsappNumber) {
    ctx.addIssue({
      code: "custom",
      path: ["whatsappNumber"],
      message: "Número de WhatsApp obligatorio cuando la acción es WHATSAPP_REDIRECT",
    })
  }
  if (tpl.postSubmitAction === "THANK_YOU_PAGE" && !tpl.thankYouPageId) {
    ctx.addIssue({
      code: "custom",
      path: ["thankYouPageId"],
      message: "Página de agradecimiento obligatoria cuando la acción es THANK_YOU_PAGE",
    })
  }
  const submitButtons = tpl.blocks.filter((b) => b.type === "SUBMIT_BUTTON")
  if (submitButtons.length !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["blocks"],
      message: `La plantilla debe tener exactamente un SUBMIT_BUTTON (encontrados: ${submitButtons.length})`,
    })
  }
})

export const shippingRestrictionSchema = z.object({
  enabled: z.boolean(),
  allowedDepartmentIds: z.array(z.string()),
  allowedProvinceIds: z.array(z.string()),
  allowedDistrictCodes: z.array(z.string()),
  restrictionMessage: z.string().nullable(),
})

export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add lib/cod-forms/schema.ts
git commit -m "feat(cod-forms): zod schemas for template + block validation"
```

---

### Task 5: Add template-variable resolver in `lib/cod-forms/template-variables.ts`

**Files:**
- Create: `lib/cod-forms/template-variables.ts`

- [ ] **Step 1: Create the resolver**

```typescript
// lib/cod-forms/template-variables.ts
// Resolves {nombre}, {telefono}, {direccion}, {distrito}, {total},
// {producto}, {pedido}, {referencia} inside any string.

export type TemplateVariables = {
  nombre?: string
  telefono?: string
  direccion?: string
  distrito?: string
  total?: string
  producto?: string
  pedido?: string
  referencia?: string
}

export function resolveTemplateVariables(
  text: string,
  vars: TemplateVariables,
): string {
  if (!text) return text
  return text.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key as keyof TemplateVariables]
    return value === undefined || value === null ? match : value
  })
}
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add lib/cod-forms/template-variables.ts
git commit -m "feat(cod-forms): template variable resolver"
```

---

## Phase 2 — Permisos, server actions y seed

### Task 6: Create permissions setup script

**Files:**
- Create: `scripts/setup-cod-forms-permissions.ts`

- [ ] **Step 1: Create the script**

```typescript
// scripts/setup-cod-forms-permissions.ts
// Adds the 4 `cod-forms:*` permissions and grants them to the appropriate roles.
// Idempotent — re-running it doesn't duplicate.
//
// Run once after deploying:
//   npx tsx scripts/setup-cod-forms-permissions.ts
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: "cod-forms:view", name: "Ver formularios COD", action: "view" },
  { key: "cod-forms:create", name: "Crear formularios COD", action: "create" },
  { key: "cod-forms:update", name: "Editar formularios COD", action: "update" },
  { key: "cod-forms:delete", name: "Eliminar formularios COD", action: "delete" },
]

const ROLE_GRANTS: Record<string, string[]> = {
  admin: ["cod-forms:view", "cod-forms:create", "cod-forms:update", "cod-forms:delete"],
  manager: ["cod-forms:view", "cod-forms:create", "cod-forms:update", "cod-forms:delete"],
  editor: ["cod-forms:view", "cod-forms:update"],
  staff: ["cod-forms:view"],
}

async function main() {
  console.log("Configurando permisos de cod-forms...")

  const created = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: {
          key: p.key,
          name: p.name,
          description: p.name,
          module: "cod-forms",
          action: p.action,
        },
      }),
    ),
  )
  console.log(`${created.length} permisos asegurados`)

  const byKey = Object.fromEntries(created.map((p) => [p.key, p]))

  for (const [roleSlug, permKeys] of Object.entries(ROLE_GRANTS)) {
    const role = await prisma.role.findUnique({ where: { slug: roleSlug } })
    if (!role) {
      console.warn(`Rol '${roleSlug}' no encontrado — saltando.`)
      continue
    }
    await Promise.all(
      permKeys.map((key) => {
        const permission = byKey[key]
        if (!permission) return Promise.resolve()
        return prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: role.id, permissionId: permission.id },
          },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        })
      }),
    )
    console.log(`Permisos asignados a rol '${roleSlug}'`)
  }
  console.log("Setup completado")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Run the script against the local DB**

```
npx tsx scripts/setup-cod-forms-permissions.ts
```

Expected stdout:
```
Configurando permisos de cod-forms...
4 permisos asegurados
Permisos asignados a rol 'admin'
Permisos asignados a rol 'manager'
Permisos asignados a rol 'editor'
Permisos asignados a rol 'staff'
Setup completado
```

- [ ] **Step 3: Commit**

```
git add scripts/setup-cod-forms-permissions.ts
git commit -m "feat(cod-forms): rbac permissions setup script"
```

---

### Task 7: Create seed script for the Default template

**Files:**
- Create: `scripts/seed-cod-form-default.ts`

- [ ] **Step 1: Create the seed script**

```typescript
// scripts/seed-cod-form-default.ts
// Creates the singleton "Default" CodFormTemplate with its initial blocks.
// Idempotent — does nothing if a template with isDefault=true already exists.
//
// Run once after deploying the schema:
//   npx tsx scripts/seed-cod-form-default.ts
import { PrismaClient } from "@prisma/client"
import {
  DEFAULT_BUTTON_STYLE,
  DEFAULT_TEMPLATE_BLOCKS,
  DEFAULT_TEMPLATE_NAME,
  getDefaultContentForType,
} from "../lib/cod-forms/defaults"

const prisma = new PrismaClient()

async function main() {
  console.log("Sembrando plantilla COD Default...")

  const existing = await prisma.codFormTemplate.findFirst({
    where: { isDefault: true },
  })
  if (existing) {
    console.log(`Plantilla Default ya existe (id=${existing.id}). Sin cambios.`)
    return
  }

  const template = await prisma.codFormTemplate.create({
    data: {
      name: DEFAULT_TEMPLATE_NAME,
      isDefault: true,
      buttonText: "Realizar Pedido y Pagar al Recibir - {total}",
      buttonStyle: DEFAULT_BUTTON_STYLE,
      postSubmitAction: "INLINE_THANK_YOU",
      thankYouTitle: "¡Gracias por tu pedido!",
      thankYouMessage:
        "Nos comunicaremos contigo en breve para coordinar la entrega.",
      blocks: {
        create: DEFAULT_TEMPLATE_BLOCKS.map((b, idx) => ({
          position: idx,
          type: b.type,
          visible: b.visible,
          required: b.required,
          content: getDefaultContentForType(b.type),
        })),
      },
    },
    include: { blocks: true },
  })

  console.log(
    `Plantilla Default creada (id=${template.id}, ${template.blocks.length} bloques).`,
  )
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Run the seed**

```
npx tsx scripts/seed-cod-form-default.ts
```

Expected stdout (first run):
```
Sembrando plantilla COD Default...
Plantilla Default creada (id=<cuid>, 9 bloques).
```

Run a second time and confirm idempotency:
```
Sembrando plantilla COD Default...
Plantilla Default ya existe (id=<cuid>). Sin cambios.
```

- [ ] **Step 3: Commit**

```
git add scripts/seed-cod-form-default.ts
git commit -m "feat(cod-forms): seed script for default template"
```

---

### Task 8: Create CRUD server actions in `actions/cod-form-templates.ts`

**Files:**
- Create: `actions/cod-form-templates.ts`

- [ ] **Step 1: Create the file with the listing + read actions**

```typescript
// actions/cod-form-templates.ts
"use server"

import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import {
  templateUpdateSchema,
  type TemplateUpdateInput,
} from "@/lib/cod-forms/schema"
import {
  DEFAULT_BUTTON_STYLE,
  DEFAULT_TEMPLATE_BLOCKS,
  getDefaultContentForType,
} from "@/lib/cod-forms/defaults"
import type { CodFormTemplateData, ButtonStyle } from "@/lib/cod-forms/types"

function serializeTemplate(t: any): CodFormTemplateData {
  return {
    id: t.id,
    name: t.name,
    isDefault: t.isDefault,
    buttonText: t.buttonText,
    buttonStyle: (t.buttonStyle as ButtonStyle) ?? DEFAULT_BUTTON_STYLE,
    postSubmitAction: t.postSubmitAction,
    thankYouTitle: t.thankYouTitle,
    thankYouMessage: t.thankYouMessage,
    whatsappNumber: t.whatsappNumber,
    whatsappMessage: t.whatsappMessage,
    thankYouPageId: t.thankYouPageId,
    thankYouPageSlug: t.thankYouPage?.slug ?? null,
    blocks: (t.blocks ?? [])
      .slice()
      .sort((a: any, b: any) => a.position - b.position)
      .map((b: any) => ({
        id: b.id,
        position: b.position,
        type: b.type,
        content: (b.content ?? {}) as Record<string, unknown>,
        visible: b.visible,
        required: b.required,
      })),
  }
}

export async function listTemplates() {
  const { response } = await requirePermission("cod-forms.view")
  if (response) throw new Error("Forbidden")

  const templates = await prisma.codFormTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true } },
      thankYouPage: { select: { id: true, slug: true } },
    },
  })

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    isDefault: t.isDefault,
    postSubmitAction: t.postSubmitAction,
    productCount: t._count.products,
    updatedAt: t.updatedAt,
  }))
}

export async function getTemplate(id: string): Promise<CodFormTemplateData> {
  const { response } = await requirePermission("cod-forms.view")
  if (response) throw new Error("Forbidden")

  const t = await prisma.codFormTemplate.findUnique({
    where: { id },
    include: { blocks: true, thankYouPage: { select: { slug: true } } },
  })
  if (!t) throw new Error("Plantilla no encontrada")
  return serializeTemplate(t)
}
```

- [ ] **Step 2: Append `createTemplate` and `duplicateTemplate`**

```typescript
export async function createTemplate(name: string): Promise<{ id: string }> {
  const { response } = await requirePermission("cod-forms.create")
  if (response) throw new Error("Forbidden")

  const trimmed = name.trim()
  if (!trimmed) throw new Error("El nombre es obligatorio")

  const existing = await prisma.codFormTemplate.findUnique({
    where: { name: trimmed },
  })
  if (existing) throw new Error("Ya existe una plantilla con ese nombre")

  const created = await prisma.codFormTemplate.create({
    data: {
      name: trimmed,
      isDefault: false,
      buttonText: "Realizar Pedido y Pagar al Recibir - {total}",
      buttonStyle: DEFAULT_BUTTON_STYLE,
      postSubmitAction: "INLINE_THANK_YOU",
      thankYouTitle: "¡Gracias por tu pedido!",
      thankYouMessage:
        "Nos comunicaremos contigo en breve para coordinar la entrega.",
      blocks: {
        create: DEFAULT_TEMPLATE_BLOCKS.map((b, idx) => ({
          position: idx,
          type: b.type,
          visible: b.visible,
          required: b.required,
          content: getDefaultContentForType(b.type),
        })),
      },
    },
  })

  revalidatePath("/admin/formularios-cod")
  return { id: created.id }
}

export async function duplicateTemplate(id: string): Promise<{ id: string }> {
  const { response } = await requirePermission("cod-forms.create")
  if (response) throw new Error("Forbidden")

  const source = await prisma.codFormTemplate.findUnique({
    where: { id },
    include: { blocks: true },
  })
  if (!source) throw new Error("Plantilla no encontrada")

  const baseName = `${source.name} (copia)`
  let candidate = baseName
  let suffix = 1
  while (
    await prisma.codFormTemplate.findUnique({ where: { name: candidate } })
  ) {
    suffix += 1
    candidate = `${baseName} ${suffix}`
  }

  const created = await prisma.codFormTemplate.create({
    data: {
      name: candidate,
      isDefault: false,
      buttonText: source.buttonText,
      buttonStyle: source.buttonStyle as any,
      postSubmitAction: source.postSubmitAction,
      thankYouTitle: source.thankYouTitle,
      thankYouMessage: source.thankYouMessage,
      whatsappNumber: source.whatsappNumber,
      whatsappMessage: source.whatsappMessage,
      thankYouPageId: source.thankYouPageId,
      blocks: {
        create: source.blocks.map((b) => ({
          position: b.position,
          type: b.type,
          visible: b.visible,
          required: b.required,
          content: b.content as any,
        })),
      },
    },
  })

  revalidatePath("/admin/formularios-cod")
  return { id: created.id }
}
```

- [ ] **Step 3: Append `updateTemplate`**

```typescript
export async function updateTemplate(
  id: string,
  input: TemplateUpdateInput,
): Promise<{ ok: true }> {
  const { response } = await requirePermission("cod-forms.update")
  if (response) throw new Error("Forbidden")

  const parsed = templateUpdateSchema.parse(input)

  const existing = await prisma.codFormTemplate.findUnique({ where: { id } })
  if (!existing) throw new Error("Plantilla no encontrada")

  // Name uniqueness (excluding self)
  if (parsed.name !== existing.name) {
    const conflict = await prisma.codFormTemplate.findUnique({
      where: { name: parsed.name },
    })
    if (conflict && conflict.id !== id) {
      throw new Error("Ya existe una plantilla con ese nombre")
    }
  }

  // Validate thankYouPageId references an existing Page
  if (parsed.thankYouPageId) {
    const page = await prisma.page.findUnique({
      where: { id: parsed.thankYouPageId },
      select: { id: true },
    })
    if (!page) throw new Error("La página seleccionada no existe")
  }

  await prisma.$transaction(async (tx) => {
    await tx.codFormTemplate.update({
      where: { id },
      data: {
        name: parsed.name,
        buttonText: parsed.buttonText,
        buttonStyle: parsed.buttonStyle as any,
        postSubmitAction: parsed.postSubmitAction,
        thankYouTitle: parsed.thankYouTitle,
        thankYouMessage: parsed.thankYouMessage,
        whatsappNumber: parsed.whatsappNumber,
        whatsappMessage: parsed.whatsappMessage,
        thankYouPageId: parsed.thankYouPageId,
      },
    })

    // Replace blocks fully (simpler than diffing — the editor sends
    // the complete ordered list every save).
    await tx.codFormBlock.deleteMany({ where: { templateId: id } })
    await tx.codFormBlock.createMany({
      data: parsed.blocks.map((b, idx) => ({
        templateId: id,
        position: idx,
        type: b.type,
        visible: b.visible,
        required: b.required,
        content: b.content as any,
      })),
    })
  })

  revalidatePath("/admin/formularios-cod")
  revalidatePath(`/admin/formularios-cod/${id}`)
  return { ok: true }
}
```

- [ ] **Step 4: Append `deleteTemplate`**

```typescript
export async function deleteTemplate(id: string): Promise<{ ok: true }> {
  const { response } = await requirePermission("cod-forms.delete")
  if (response) throw new Error("Forbidden")

  const t = await prisma.codFormTemplate.findUnique({
    where: { id },
    select: { id: true, isDefault: true },
  })
  if (!t) throw new Error("Plantilla no encontrada")
  if (t.isDefault) throw new Error("No se puede eliminar la plantilla Default")

  const fallback = await prisma.codFormTemplate.findFirst({
    where: { isDefault: true },
    select: { id: true },
  })
  if (!fallback) {
    throw new Error("No hay plantilla Default para reasignar productos")
  }

  await prisma.$transaction([
    // Reassign any products on this template to Default before deleting.
    prisma.product.updateMany({
      where: { codFormTemplateId: id },
      data: { codFormTemplateId: fallback.id },
    }),
    prisma.codFormTemplate.delete({ where: { id } }),
  ])

  revalidatePath("/admin/formularios-cod")
  return { ok: true }
}
```

- [ ] **Step 5: Append `assignTemplateToProducts` and `unassignProductsFromTemplate`**

```typescript
import type { CheckoutMode } from "@prisma/client"

export async function assignTemplateToProducts(
  templateId: string,
  productIds: string[],
  checkoutMode?: CheckoutMode,
): Promise<{ updated: number }> {
  const { response } = await requirePermission("cod-forms.update")
  if (response) throw new Error("Forbidden")

  const tpl = await prisma.codFormTemplate.findUnique({
    where: { id: templateId },
    select: { id: true },
  })
  if (!tpl) throw new Error("Plantilla no encontrada")

  const data: { codFormTemplateId: string; checkoutMode?: CheckoutMode } = {
    codFormTemplateId: templateId,
  }
  if (checkoutMode) data.checkoutMode = checkoutMode

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data,
  })

  revalidatePath("/admin/productos")
  revalidatePath(`/admin/formularios-cod/${templateId}`)
  return { updated: result.count }
}

export async function unassignProductsFromTemplate(
  templateId: string,
  productIds: string[],
): Promise<{ updated: number }> {
  const { response } = await requirePermission("cod-forms.update")
  if (response) throw new Error("Forbidden")

  const fallback = await prisma.codFormTemplate.findFirst({
    where: { isDefault: true },
    select: { id: true },
  })
  if (!fallback) throw new Error("No hay plantilla Default")

  const result = await prisma.product.updateMany({
    where: { id: { in: productIds }, codFormTemplateId: templateId },
    data: { codFormTemplateId: fallback.id },
  })

  revalidatePath("/admin/productos")
  revalidatePath(`/admin/formularios-cod/${templateId}`)
  return { updated: result.count }
}
```

- [ ] **Step 6: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```
git add actions/cod-form-templates.ts
git commit -m "feat(cod-forms): server actions for crud + bulk assign"
```

---

### Task 9: Add `cod-forms:*` permission slugs to `lib/permissions.ts`

**Files:**
- Modify: `lib/permissions.ts`

- [ ] **Step 1: Read the file to find the existing permission slug list**

```
Read lib/permissions.ts
```

Identify the array/union that lists all valid permission slugs (similar to how `themes:view`, `pages:view`, etc. are declared).

- [ ] **Step 2: Add the four new slugs**

Append to the same list/union:

```typescript
"cod-forms:view",
"cod-forms:create",
"cod-forms:update",
"cod-forms:delete",
```

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add lib/permissions.ts
git commit -m "feat(cod-forms): register cod-forms:* permission slugs"
```

---

## Phase 3 — Listado admin

### Task 10: Sidebar entry under "Configuración" group of admin layout

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Locate the existing nav items array** (look for `LayoutTemplate`, `ScrollText`, etc. — items already imported from `lucide-react`).

- [ ] **Step 2: Add the import**

In the `lucide-react` import block, add `ClipboardList`:

```typescript
import {
  // ... existing imports
  ClipboardList,
} from "lucide-react";
```

- [ ] **Step 3: Add a top-level nav item for the COD form templates**

Find the array of `NavItem` entries (the one that contains "Productos", "Pedidos", "Páginas", etc.) and add — placed alphabetically near "Plantillas":

```tsx
{
  href: "/admin/formularios-cod",
  icon: ClipboardList,
  label: "Formularios COD",
},
```

- [ ] **Step 4: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 5: Smoke test (manual)**

```
npm run dev
```

Open `http://localhost:3000/admin` (logged in as admin). Confirm "Formularios COD" appears in the sidebar with the `ClipboardList` icon.

- [ ] **Step 6: Commit**

```
git add app/admin/layout.tsx
git commit -m "feat(cod-forms): sidebar nav entry"
```

---

### Task 11: List page at `/admin/formularios-cod`

**Files:**
- Create: `app/admin/formularios-cod/page.tsx`
- Create: `components/admin/cod-forms/CodFormTemplatesList.tsx`

- [ ] **Step 1: Create the server component page**

```tsx
// app/admin/formularios-cod/page.tsx
import { protectRoute } from "@/lib/protect-route"
import { listTemplates } from "@/actions/cod-form-templates"
import CodFormTemplatesList from "@/components/admin/cod-forms/CodFormTemplatesList"

export const metadata = { title: "Formularios COD | Admin" }

export default async function FormulariosCodPage() {
  await protectRoute("cod-forms:view")
  const templates = await listTemplates()
  return <CodFormTemplatesList templates={templates} />
}
```

- [ ] **Step 2: Create the client list component**

```tsx
// components/admin/cod-forms/CodFormTemplatesList.tsx
"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Star, Copy, Trash2, Plus, MessageCircle, ExternalLink, Inbox } from "lucide-react"
import { toast } from "sonner"
import {
  createTemplate,
  duplicateTemplate,
  deleteTemplate,
} from "@/actions/cod-form-templates"
import type { PostSubmitAction } from "@/lib/cod-forms/types"

type Row = {
  id: string
  name: string
  isDefault: boolean
  postSubmitAction: PostSubmitAction
  productCount: number
  updatedAt: Date
}

const ACTION_LABEL: Record<PostSubmitAction, string> = {
  INLINE_THANK_YOU: "Mensaje en pantalla",
  WHATSAPP_REDIRECT: "WhatsApp",
  THANK_YOU_PAGE: "Página de agradecimiento",
}

const ACTION_ICON: Record<PostSubmitAction, typeof Inbox> = {
  INLINE_THANK_YOU: Inbox,
  WHATSAPP_REDIRECT: MessageCircle,
  THANK_YOU_PAGE: ExternalLink,
}

export default function CodFormTemplatesList({ templates }: { templates: Row[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")

  const onCreate = () => {
    startTransition(async () => {
      try {
        const { id } = await createTemplate(newName)
        toast.success("Plantilla creada")
        setCreating(false)
        setNewName("")
        router.push(`/admin/formularios-cod/${id}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al crear")
      }
    })
  }

  const onDuplicate = (id: string) => {
    startTransition(async () => {
      try {
        const { id: newId } = await duplicateTemplate(id)
        toast.success("Plantilla duplicada")
        router.push(`/admin/formularios-cod/${newId}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al duplicar")
      }
    })
  }

  const onDelete = (id: string, name: string) => {
    if (!confirm(`Eliminar la plantilla "${name}"? Sus productos se reasignarán a Default.`)) return
    startTransition(async () => {
      try {
        await deleteTemplate(id)
        toast.success("Plantilla eliminada")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al eliminar")
      }
    })
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Formularios COD</h1>
          <p className="text-sm text-muted-foreground">
            Plantillas reutilizables del formulario de Pago Contra Entrega.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={pending}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva plantilla
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Nombre</th>
              <th className="text-left px-4 py-2 font-medium">Acción al confirmar</th>
              <th className="text-left px-4 py-2 font-medium">Productos</th>
              <th className="text-right px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const Icon = ACTION_ICON[t.postSubmitAction]
              return (
                <tr key={t.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/formularios-cod/${t.id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      {t.isDefault && <Star className="h-4 w-4 text-amber-500 fill-current" />}
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {ACTION_LABEL[t.postSubmitAction]}
                    </span>
                  </td>
                  <td className="px-4 py-2">{t.productCount}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(t.id)}
                      disabled={pending}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(t.id, t.name)}
                      disabled={pending || t.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {templates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No hay plantillas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla COD</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nombre de la plantilla"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={pending}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={onCreate} disabled={pending || !newName.trim()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 4: Smoke test (manual)**

```
npm run dev
```

Visit `http://localhost:3000/admin/formularios-cod`. Verify:
- The Default template appears with a star icon.
- "Nueva plantilla" opens the dialog. Create one named "Test"; you get redirected to `/admin/formularios-cod/<id>` (the editor 404s for now — that comes in Task 12).
- Back at the list, "Test" appears below Default. Duplicate it; "Test (copia)" appears. Delete "Test (copia)"; it disappears.
- The Eliminar button is disabled on the Default row.

- [ ] **Step 5: Commit**

```
git add app/admin/formularios-cod/page.tsx components/admin/cod-forms/CodFormTemplatesList.tsx
git commit -m "feat(cod-forms): admin list page with create/duplicate/delete"
```

---

## Phase 4 — Editor admin: shell, store, toolbar, popover

### Task 12: Zustand store for the editor in `components/admin/cod-forms/store.ts`

**Files:**
- Create: `components/admin/cod-forms/store.ts`

- [ ] **Step 1: Create the store**

```typescript
// components/admin/cod-forms/store.ts
"use client"

import { create } from "zustand"
import type {
  CodFormTemplateData,
  CodFormBlock,
  ButtonStyle,
  PostSubmitAction,
  CodFormBlockType,
} from "@/lib/cod-forms/types"

type EditorState = CodFormTemplateData & {
  saveStatus: "idle" | "saving" | "saved" | "error"
  setName: (name: string) => void
  setButtonText: (v: string) => void
  setButtonStyle: (patch: Partial<ButtonStyle>) => void
  setPostSubmit: (a: PostSubmitAction) => void
  setThankYouTitle: (v: string | null) => void
  setThankYouMessage: (v: string | null) => void
  setWhatsappNumber: (v: string | null) => void
  setWhatsappMessage: (v: string | null) => void
  setThankYouPageId: (v: string | null) => void
  setBlocks: (blocks: CodFormBlock[]) => void
  patchBlock: (id: string, patch: Partial<CodFormBlock>) => void
  addBlock: (type: CodFormBlockType) => void
  removeBlock: (id: string) => void
  setSaveStatus: (s: EditorState["saveStatus"]) => void
  hydrate: (data: CodFormTemplateData) => void
}

export const useCodFormEditor = create<EditorState>((set) => ({
  // Filled by hydrate()
  id: "",
  name: "",
  isDefault: false,
  buttonText: "",
  buttonStyle: {} as ButtonStyle,
  postSubmitAction: "INLINE_THANK_YOU",
  thankYouTitle: null,
  thankYouMessage: null,
  whatsappNumber: null,
  whatsappMessage: null,
  thankYouPageId: null,
  thankYouPageSlug: null,
  blocks: [],
  saveStatus: "idle",

  hydrate: (data) => set({ ...data, saveStatus: "idle" }),
  setName: (name) => set({ name }),
  setButtonText: (buttonText) => set({ buttonText }),
  setButtonStyle: (patch) =>
    set((s) => ({ buttonStyle: { ...s.buttonStyle, ...patch } })),
  setPostSubmit: (postSubmitAction) => set({ postSubmitAction }),
  setThankYouTitle: (thankYouTitle) => set({ thankYouTitle }),
  setThankYouMessage: (thankYouMessage) => set({ thankYouMessage }),
  setWhatsappNumber: (whatsappNumber) => set({ whatsappNumber }),
  setWhatsappMessage: (whatsappMessage) => set({ whatsappMessage }),
  setThankYouPageId: (thankYouPageId) => set({ thankYouPageId }),
  setBlocks: (blocks) =>
    set({ blocks: blocks.map((b, idx) => ({ ...b, position: idx })) }),
  patchBlock: (id, patch) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),
  addBlock: (type) =>
    set((s) => {
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const submitButtonIdx = s.blocks.findIndex((b) => b.type === "SUBMIT_BUTTON")
      const newBlock: CodFormBlock = {
        id,
        position: 0,
        type,
        content: {},
        visible: true,
        required: false,
      }
      // Insert before SUBMIT_BUTTON if it exists, otherwise append.
      const next =
        submitButtonIdx >= 0
          ? [
              ...s.blocks.slice(0, submitButtonIdx),
              newBlock,
              ...s.blocks.slice(submitButtonIdx),
            ]
          : [...s.blocks, newBlock]
      return { blocks: next.map((b, idx) => ({ ...b, position: idx })) }
    }),
  removeBlock: (id) =>
    set((s) => ({
      blocks: s.blocks
        .filter((b) => b.id !== id)
        .map((b, idx) => ({ ...b, position: idx })),
    })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
}))
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add components/admin/cod-forms/store.ts
git commit -m "feat(cod-forms): zustand store for editor state"
```

---

### Task 13: Editor page route at `/admin/formularios-cod/[id]`

**Files:**
- Create: `app/admin/formularios-cod/[id]/page.tsx`
- Create: `components/admin/cod-forms/CodFormEditor.tsx`

- [ ] **Step 1: Create the server component page**

```tsx
// app/admin/formularios-cod/[id]/page.tsx
import { notFound } from "next/navigation"
import { protectRoute } from "@/lib/protect-route"
import { getTemplate } from "@/actions/cod-form-templates"
import { prisma } from "@/lib/db"
import CodFormEditor from "@/components/admin/cod-forms/CodFormEditor"

export const dynamic = "force-dynamic"

export default async function CodFormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await protectRoute("cod-forms:view")
  const { id } = await params

  let template
  try {
    template = await getTemplate(id)
  } catch {
    notFound()
  }

  const pages = await prisma.page.findMany({
    where: { active: true },
    select: { id: true, slug: true, title: true },
    orderBy: { title: "asc" },
  })

  return <CodFormEditor template={template} pages={pages} />
}
```

- [ ] **Step 2: Create the editor shell (full layout placeholder)**

```tsx
// components/admin/cod-forms/CodFormEditor.tsx
"use client"

import { useEffect } from "react"
import EditorToolbar from "./EditorToolbar"
import ButtonStyleEditor from "./ButtonStyleEditor"
import BlocksList from "./BlocksList"
import PreviewPanel from "./PreviewPanel"
import { useCodFormEditor } from "./store"
import type { CodFormTemplateData } from "@/lib/cod-forms/types"

type PageOpt = { id: string; slug: string; title: string }

export default function CodFormEditor({
  template,
  pages,
}: {
  template: CodFormTemplateData
  pages: PageOpt[]
}) {
  const hydrate = useCodFormEditor((s) => s.hydrate)

  useEffect(() => {
    hydrate(template)
  }, [template, hydrate])

  return (
    <div className="flex h-screen flex-col bg-background">
      <EditorToolbar pages={pages} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/2 overflow-y-auto border-r p-4 space-y-4">
          <ButtonStyleEditor />
          <BlocksList />
        </aside>
        <main className="w-1/2 overflow-y-auto p-4 bg-muted/20">
          <PreviewPanel />
        </main>
      </div>
    </div>
  )
}
```

(The four child components will be created in subsequent tasks. Stub them as empty exports before running the build, OR create them in the order below before verifying.)

- [ ] **Step 3: Create stubs for the four children so the page compiles**

Create each as a single-line placeholder:

```tsx
// components/admin/cod-forms/EditorToolbar.tsx
"use client"
export default function EditorToolbar(_: { pages: { id: string; slug: string; title: string }[] }) {
  return <div className="border-b p-2">Toolbar (stub)</div>
}
```

```tsx
// components/admin/cod-forms/ButtonStyleEditor.tsx
"use client"
export default function ButtonStyleEditor() {
  return <div className="border rounded p-2">ButtonStyleEditor (stub)</div>
}
```

```tsx
// components/admin/cod-forms/BlocksList.tsx
"use client"
export default function BlocksList() {
  return <div className="border rounded p-2">BlocksList (stub)</div>
}
```

```tsx
// components/admin/cod-forms/PreviewPanel.tsx
"use client"
export default function PreviewPanel() {
  return <div className="border rounded p-2">PreviewPanel (stub)</div>
}
```

- [ ] **Step 4: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 5: Smoke test (manual)**

```
npm run dev
```

Visit `/admin/formularios-cod/<default-id>` (click into Default from the list). Confirm the page renders the four stub regions in a split-screen layout.

- [ ] **Step 6: Commit**

```
git add app/admin/formularios-cod components/admin/cod-forms/CodFormEditor.tsx components/admin/cod-forms/EditorToolbar.tsx components/admin/cod-forms/ButtonStyleEditor.tsx components/admin/cod-forms/BlocksList.tsx components/admin/cod-forms/PreviewPanel.tsx
git commit -m "feat(cod-forms): editor shell with stub child panels"
```

---

### Task 14: Implement `EditorToolbar` with auto-save + name editing + settings popover trigger

**Files:**
- Modify: `components/admin/cod-forms/EditorToolbar.tsx`
- Create: `components/admin/cod-forms/PostSubmitActionPopover.tsx`

- [ ] **Step 1: Replace the EditorToolbar stub**

```tsx
// components/admin/cod-forms/EditorToolbar.tsx
"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Settings, Loader2, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCodFormEditor } from "./store"
import { updateTemplate } from "@/actions/cod-form-templates"
import { templateUpdateSchema } from "@/lib/cod-forms/schema"
import PostSubmitActionPopover from "./PostSubmitActionPopover"

const SAVE_DEBOUNCE_MS = 600

type PageOpt = { id: string; slug: string; title: string }

export default function EditorToolbar({ pages }: { pages: PageOpt[] }) {
  const state = useCodFormEditor()
  const setSaveStatus = useCodFormEditor((s) => s.setSaveStatus)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>("")

  // Snapshot of fields that should trigger auto-save.
  const snapshotJson = JSON.stringify({
    name: state.name,
    buttonText: state.buttonText,
    buttonStyle: state.buttonStyle,
    postSubmitAction: state.postSubmitAction,
    thankYouTitle: state.thankYouTitle,
    thankYouMessage: state.thankYouMessage,
    whatsappNumber: state.whatsappNumber,
    whatsappMessage: state.whatsappMessage,
    thankYouPageId: state.thankYouPageId,
    blocks: state.blocks,
  })

  useEffect(() => {
    // Skip the initial hydration "save".
    if (!lastSavedRef.current) {
      lastSavedRef.current = snapshotJson
      return
    }
    if (snapshotJson === lastSavedRef.current) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setSaveStatus("saving")
    timeoutRef.current = setTimeout(async () => {
      const parsed = templateUpdateSchema.safeParse({
        name: state.name,
        buttonText: state.buttonText,
        buttonStyle: state.buttonStyle,
        postSubmitAction: state.postSubmitAction,
        thankYouTitle: state.thankYouTitle,
        thankYouMessage: state.thankYouMessage,
        whatsappNumber: state.whatsappNumber,
        whatsappMessage: state.whatsappMessage,
        thankYouPageId: state.thankYouPageId,
        blocks: state.blocks.map((b, idx) => ({
          ...b,
          position: idx,
        })),
      })
      if (!parsed.success) {
        setSaveStatus("error")
        return
      }
      try {
        await updateTemplate(state.id, parsed.data)
        lastSavedRef.current = snapshotJson
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [snapshotJson, state, setSaveStatus])

  return (
    <header className="flex items-center gap-3 border-b px-4 py-2">
      <Link href="/admin/formularios-cod">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </Link>
      <Input
        value={state.name}
        onChange={(e) => useCodFormEditor.getState().setName(e.target.value)}
        className="max-w-xs font-medium"
      />
      <PostSubmitActionPopover pages={pages}>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Acción al confirmar
        </Button>
      </PostSubmitActionPopover>
      <div className="ml-auto flex items-center text-xs text-muted-foreground gap-1">
        {state.saveStatus === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando...
          </>
        )}
        {state.saveStatus === "saved" && (
          <>
            <Check className="h-3 w-3 text-green-600" />
            Guardado
          </>
        )}
        {state.saveStatus === "error" && (
          <span className="text-red-600">Error al guardar</span>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create the PostSubmitActionPopover**

```tsx
// components/admin/cod-forms/PostSubmitActionPopover.tsx
"use client"

import { type ReactNode } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCodFormEditor } from "./store"
import type { PostSubmitAction } from "@/lib/cod-forms/types"

type PageOpt = { id: string; slug: string; title: string }

export default function PostSubmitActionPopover({
  pages,
  children,
}: {
  pages: PageOpt[]
  children: ReactNode
}) {
  const action = useCodFormEditor((s) => s.postSubmitAction)
  const set = useCodFormEditor.getState()
  const {
    thankYouTitle,
    thankYouMessage,
    whatsappNumber,
    whatsappMessage,
    thankYouPageId,
  } = useCodFormEditor()

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 space-y-3">
        <div className="font-medium text-sm">Acción al confirmar el pedido</div>
        <RadioGroup
          value={action}
          onValueChange={(v) => set.setPostSubmit(v as PostSubmitAction)}
          className="space-y-3"
        >
          {/* WhatsApp */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="WHATSAPP_REDIRECT" id="opt-wa" />
              <Label htmlFor="opt-wa">Enviar a WhatsApp</Label>
            </div>
            {action === "WHATSAPP_REDIRECT" && (
              <div className="ml-6 space-y-2">
                <div>
                  <Label className="text-xs">Número</Label>
                  <Input
                    value={whatsappNumber ?? ""}
                    onChange={(e) =>
                      set.setWhatsappNumber(e.target.value || null)
                    }
                    placeholder="+51999999999"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mensaje WhatsApp</Label>
                  <Textarea
                    value={whatsappMessage ?? ""}
                    onChange={(e) =>
                      set.setWhatsappMessage(e.target.value || null)
                    }
                    rows={4}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="border-t pt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Agradecimiento que ve el cliente en pantalla
                  </p>
                  <Input
                    placeholder="Título"
                    value={thankYouTitle ?? ""}
                    onChange={(e) =>
                      set.setThankYouTitle(e.target.value || null)
                    }
                  />
                  <Textarea
                    placeholder="Mensaje"
                    rows={2}
                    value={thankYouMessage ?? ""}
                    onChange={(e) =>
                      set.setThankYouMessage(e.target.value || null)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Page redirect */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="THANK_YOU_PAGE" id="opt-page" />
              <Label htmlFor="opt-page">
                Redirigir a página de agradecimiento
              </Label>
            </div>
            {action === "THANK_YOU_PAGE" && (
              <div className="ml-6">
                <Label className="text-xs">Página</Label>
                <select
                  value={thankYouPageId ?? ""}
                  onChange={(e) =>
                    set.setThankYouPageId(e.target.value || null)
                  }
                  className="w-full border rounded h-9 px-2 text-sm"
                >
                  <option value="">— Seleccionar —</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (/{p.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Inline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="INLINE_THANK_YOU" id="opt-inline" />
              <Label htmlFor="opt-inline">
                Mostrar agradecimiento encima del formulario
              </Label>
            </div>
            {action === "INLINE_THANK_YOU" && (
              <div className="ml-6 space-y-2">
                <Input
                  placeholder="Título"
                  value={thankYouTitle ?? ""}
                  onChange={(e) =>
                    set.setThankYouTitle(e.target.value || null)
                  }
                />
                <Textarea
                  placeholder="Mensaje"
                  rows={2}
                  value={thankYouMessage ?? ""}
                  onChange={(e) =>
                    set.setThankYouMessage(e.target.value || null)
                  }
                />
              </div>
            )}
          </div>
        </RadioGroup>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 4: Smoke test (manual)**

`npm run dev` → open editor of Default. Verify:
- Editing the name input shows "Guardando..." then "Guardado" after the debounce.
- Clicking "Acción al confirmar" opens the popover. Switch between the three radios; each shows different fields. Editing those fields auto-saves.
- Refresh the page; the name and selected action persist.

- [ ] **Step 5: Commit**

```
git add components/admin/cod-forms/EditorToolbar.tsx components/admin/cod-forms/PostSubmitActionPopover.tsx
git commit -m "feat(cod-forms): editor toolbar with autosave + post-submit popover"
```

---

## Phase 5 — Editor admin: panel izquierdo (botón + bloques)

### Task 15: Implement `ButtonStyleEditor`

**Files:**
- Modify: `components/admin/cod-forms/ButtonStyleEditor.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
// components/admin/cod-forms/ButtonStyleEditor.tsx
"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useCodFormEditor } from "./store"

export default function ButtonStyleEditor() {
  const [open, setOpen] = useState(true)
  const buttonText = useCodFormEditor((s) => s.buttonText)
  const style = useCodFormEditor((s) => s.buttonStyle)
  const setText = useCodFormEditor((s) => s.setButtonText)
  const patch = useCodFormEditor((s) => s.setButtonStyle)

  return (
    <section className="border rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 font-medium text-sm"
      >
        <span>Botón de compra</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="p-3 border-t space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Texto del botón</Label>
              <Input value={buttonText} onChange={(e) => setText(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-0.5">
                Soporta variables como {"{total}"}.
              </p>
            </div>
            <div>
              <Label className="text-xs">Subtítulo</Label>
              <Input
                value={style.subtitle ?? ""}
                onChange={(e) => patch({ subtitle: e.target.value || null })}
                placeholder="Subtítulo opcional"
              />
            </div>
            <div>
              <Label className="text-xs">Tamaño (px)</Label>
              <Input
                type="number"
                value={style.fontSize ?? 16}
                onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                min={8}
                max={72}
              />
            </div>
            <div>
              <Label className="text-xs">Color del texto</Label>
              <Input
                type="color"
                value={style.textColor ?? "#ffffff"}
                onChange={(e) => patch({ textColor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Color de fondo</Label>
              <Input
                type="color"
                value={style.bgColor ?? "#000000"}
                onChange={(e) => patch({ bgColor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Color del borde</Label>
              <Input
                type="color"
                value={style.borderColor ?? "#000000"}
                onChange={(e) => patch({ borderColor: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Ancho del borde (px)</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={style.borderWidth ?? 0}
                onChange={(e) => patch({ borderWidth: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Esquinas redondeadas (px)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={style.borderRadius ?? 8}
                onChange={(e) => patch({ borderRadius: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Sombra (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={style.shadow ?? 0}
                onChange={(e) => patch({ shadow: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Animación</Label>
              <select
                className="w-full border rounded h-9 px-2"
                value={style.animation ?? "none"}
                onChange={(e) => patch({ animation: e.target.value as any })}
              >
                <option value="none">Ninguna</option>
                <option value="pulse">Pulsar</option>
                <option value="shake">Sacudir</option>
                <option value="bounce">Rebotar</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Ícono (lucide)</Label>
              <Input
                value={style.icon ?? ""}
                onChange={(e) => patch({ icon: e.target.value || null })}
                placeholder="ShoppingBag, ShoppingCart, ..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant={style.fontWeight === "bold" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                patch({ fontWeight: style.fontWeight === "bold" ? "normal" : "bold" })
              }
            >
              <strong>B</strong>
            </Button>
            <Button
              variant={style.fontStyle === "italic" ? "default" : "outline"}
              size="sm"
              onClick={() =>
                patch({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })
              }
            >
              <em>I</em>
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add components/admin/cod-forms/ButtonStyleEditor.tsx
git commit -m "feat(cod-forms): rich submit-button style editor"
```

---

### Task 16: Implement `BlocksList` with drag-and-drop

**Files:**
- Modify: `components/admin/cod-forms/BlocksList.tsx`
- Create: `components/admin/cod-forms/SortableBlockItem.tsx`
- Create: `components/admin/cod-forms/AddBlockSelector.tsx`
- Create: `components/admin/cod-forms/BlockEditPanel.tsx`

- [ ] **Step 1: Create the SortableBlockItem**

```tsx
// components/admin/cod-forms/SortableBlockItem.tsx
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Eye, EyeOff, Pencil, Trash2 } from "lucide-react"
import {
  Type,
  ShoppingCart,
  Truck,
  Receipt,
  CheckCircle,
  User,
  Phone,
  Mail,
  IdCard,
  MapPin,
  Building,
  Map,
  StickyNote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CodFormBlock, CodFormBlockType } from "@/lib/cod-forms/types"

const ICONS: Record<CodFormBlockType, typeof Type> = {
  HEADER: Type,
  CART_ITEMS: ShoppingCart,
  SHIPPING_OPTIONS: Truck,
  ORDER_SUMMARY: Receipt,
  SUBMIT_BUTTON: CheckCircle,
  FIELD_NAME: User,
  FIELD_PHONE: Phone,
  FIELD_EMAIL: Mail,
  FIELD_DNI: IdCard,
  FIELD_ADDRESS: MapPin,
  FIELD_ADDRESS_2: MapPin,
  FIELD_PROVINCE: Map,
  FIELD_CITY: Building,
  FIELD_REFERENCE: StickyNote,
  FIELD_NOTES: StickyNote,
}

const LABELS: Record<CodFormBlockType, string> = {
  HEADER: "Encabezado",
  CART_ITEMS: "Contenido del carrito",
  SHIPPING_OPTIONS: "Opciones de envío",
  ORDER_SUMMARY: "Resumen del pedido",
  SUBMIT_BUTTON: "Botón de compra",
  FIELD_NAME: "Nombre",
  FIELD_PHONE: "Teléfono",
  FIELD_EMAIL: "Email",
  FIELD_DNI: "DNI",
  FIELD_ADDRESS: "Dirección",
  FIELD_ADDRESS_2: "Dirección 2",
  FIELD_PROVINCE: "Provincia",
  FIELD_CITY: "Distrito",
  FIELD_REFERENCE: "Referencia",
  FIELD_NOTES: "Notas",
}

export function blockTypeLabel(t: CodFormBlockType) {
  return LABELS[t]
}

export default function SortableBlockItem({
  block,
  onEdit,
  onToggleVisible,
  onDelete,
}: {
  block: CodFormBlock
  onEdit: () => void
  onToggleVisible: () => void
  onDelete: () => void
}) {
  const Icon = ICONS[block.type]
  const isSubmit = block.type === "SUBMIT_BUTTON"
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border rounded text-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 truncate">{LABELS[block.type]}</span>
      {!isSubmit && (
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onToggleVisible}>
        {block.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={isSubmit}
        aria-label="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create the AddBlockSelector**

```tsx
// components/admin/cod-forms/AddBlockSelector.tsx
"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCodFormEditor } from "./store"
import {
  FIELD_BLOCK_TYPES,
  STRUCTURAL_BLOCK_TYPES,
  SINGLETON_BLOCK_TYPES,
} from "@/lib/cod-forms/types"
import { getDefaultContentForType } from "@/lib/cod-forms/defaults"
import { blockTypeLabel } from "./SortableBlockItem"
import type { CodFormBlockType } from "@/lib/cod-forms/types"

export default function AddBlockSelector() {
  const [open, setOpen] = useState(false)
  const blocks = useCodFormEditor((s) => s.blocks)
  const addBlock = useCodFormEditor((s) => s.addBlock)
  const patchBlock = useCodFormEditor((s) => s.patchBlock)

  const presentTypes = new Set(blocks.map((b) => b.type))
  // SUBMIT_BUTTON is excluded entirely (it's mandatory and pre-existing).
  const available = [...STRUCTURAL_BLOCK_TYPES, ...FIELD_BLOCK_TYPES].filter(
    (t) =>
      t !== "SUBMIT_BUTTON" &&
      (!SINGLETON_BLOCK_TYPES.includes(t) || !presentTypes.has(t)),
  )

  const onPick = (type: CodFormBlockType) => {
    addBlock(type)
    // Initialize content from defaults
    const next = useCodFormEditor.getState().blocks
    const inserted = next.find((b) => b.type === type && Object.keys(b.content).length === 0)
    if (inserted) {
      patchBlock(inserted.id, { content: getDefaultContentForType(type) })
    }
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-center"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar nuevos campos
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar bloque</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {available.map((t) => (
              <Button
                key={t}
                variant="outline"
                className="justify-start"
                onClick={() => onPick(t)}
              >
                {blockTypeLabel(t)}
              </Button>
            ))}
            {available.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">
                No quedan tipos disponibles.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 3: Create the BlockEditPanel**

```tsx
// components/admin/cod-forms/BlockEditPanel.tsx
"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useCodFormEditor } from "./store"
import { blockTypeLabel } from "./SortableBlockItem"
import { FIELD_BLOCK_TYPES } from "@/lib/cod-forms/types"
import type { CodFormBlock } from "@/lib/cod-forms/types"

export default function BlockEditPanel({
  blockId,
  onClose,
}: {
  blockId: string | null
  onClose: () => void
}) {
  const block = useCodFormEditor((s) =>
    s.blocks.find((b) => b.id === blockId) ?? null,
  ) as CodFormBlock | null
  const patchBlock = useCodFormEditor((s) => s.patchBlock)

  const open = block !== null

  if (!block) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent />
      </Sheet>
    )
  }

  const isField = FIELD_BLOCK_TYPES.includes(block.type)
  const c = block.content as any

  const setContent = (patch: Record<string, unknown>) =>
    patchBlock(block.id, { content: { ...block.content, ...patch } })

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar: {blockTypeLabel(block.type)}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 text-sm">
          {isField && (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="bep-required">Marcar como obligatorio</Label>
                <Switch
                  id="bep-required"
                  checked={block.required}
                  onCheckedChange={(v) => patchBlock(block.id, { required: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="bep-hide">Ocultar etiqueta</Label>
                <Switch
                  id="bep-hide"
                  checked={Boolean(c.hideLabel)}
                  onCheckedChange={(v) => setContent({ hideLabel: v })}
                />
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={c.label ?? ""} onChange={(e) => setContent({ label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Marcador de posición</Label>
                <Input value={c.placeholder ?? ""} onChange={(e) => setContent({ placeholder: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Mensaje de error</Label>
                <Input value={c.errorMessage ?? ""} onChange={(e) => setContent({ errorMessage: e.target.value })} />
              </div>
            </>
          )}

          {block.type === "HEADER" && (
            <>
              <div>
                <Label className="text-xs">Texto</Label>
                <Textarea
                  value={c.text ?? ""}
                  onChange={(e) => setContent({ text: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-xs">Alineación</Label>
                <select
                  className="w-full border rounded h-9 px-2"
                  value={c.align ?? "left"}
                  onChange={(e) => setContent({ align: e.target.value })}
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                  <option value="right">Derecha</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tamaño (px)</Label>
                  <Input
                    type="number"
                    value={c.fontSize ?? 18}
                    min={8}
                    max={72}
                    onChange={(e) => setContent({ fontSize: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={c.color ?? "#000000"}
                    onChange={(e) => setContent({ color: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Negrita</Label>
                <Switch
                  checked={c.fontWeight === "bold"}
                  onCheckedChange={(v) =>
                    setContent({ fontWeight: v ? "bold" : "normal" })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Cursiva</Label>
                <Switch
                  checked={c.fontStyle === "italic"}
                  onCheckedChange={(v) =>
                    setContent({ fontStyle: v ? "italic" : "normal" })
                  }
                />
              </div>
            </>
          )}

          {block.type === "CART_ITEMS" && (
            <>
              <ToggleRow label="Mostrar miniatura" value={Boolean(c.showThumbnail)} onChange={(v) => setContent({ showThumbnail: v })} />
              <ToggleRow label="Mostrar variante" value={Boolean(c.showVariant)} onChange={(v) => setContent({ showVariant: v })} />
              <ToggleRow label="Selector de cantidad" value={Boolean(c.showQuantitySelector)} onChange={(v) => setContent({ showQuantitySelector: v })} />
            </>
          )}

          {block.type === "SHIPPING_OPTIONS" && (
            <ToggleRow label="Mostrar 'Envío gratis'" value={Boolean(c.showFreeShipping)} onChange={(v) => setContent({ showFreeShipping: v })} />
          )}

          {block.type === "ORDER_SUMMARY" && (
            <>
              <ToggleRow label="Mostrar Subtotal" value={Boolean(c.showSubtotal)} onChange={(v) => setContent({ showSubtotal: v })} />
              <ToggleRow label="Mostrar Descuento" value={Boolean(c.showDiscount)} onChange={(v) => setContent({ showDiscount: v })} />
              <ToggleRow label="Mostrar Envío" value={Boolean(c.showShipping)} onChange={(v) => setContent({ showShipping: v })} />
              <ToggleRow label="Mostrar Total" value={Boolean(c.showTotal)} onChange={(v) => setContent({ showTotal: v })} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}
```

- [ ] **Step 4: Replace the BlocksList stub**

```tsx
// components/admin/cod-forms/BlocksList.tsx
"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useCodFormEditor } from "./store"
import SortableBlockItem from "./SortableBlockItem"
import AddBlockSelector from "./AddBlockSelector"
import BlockEditPanel from "./BlockEditPanel"

export default function BlocksList() {
  const sensors = useSensors(useSensor(PointerSensor))
  const blocks = useCodFormEditor((s) => s.blocks)
  const setBlocks = useCodFormEditor((s) => s.setBlocks)
  const patchBlock = useCodFormEditor((s) => s.patchBlock)
  const removeBlock = useCodFormEditor((s) => s.removeBlock)
  const [editingId, setEditingId] = useState<string | null>(null)

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex((b) => b.id === active.id)
    const newIdx = blocks.findIndex((b) => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    setBlocks(arrayMove(blocks, oldIdx, newIdx))
  }

  return (
    <section className="border rounded-lg bg-white">
      <div className="p-3 border-b font-medium text-sm">Formulario</div>
      <div className="p-3 space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((b) => (
              <SortableBlockItem
                key={b.id}
                block={b}
                onEdit={() => setEditingId(b.id)}
                onToggleVisible={() => patchBlock(b.id, { visible: !b.visible })}
                onDelete={() => {
                  if (b.type === "SUBMIT_BUTTON") return
                  if (confirm("¿Eliminar este bloque?")) removeBlock(b.id)
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
        <AddBlockSelector />
      </div>
      <BlockEditPanel blockId={editingId} onClose={() => setEditingId(null)} />
    </section>
  )
}
```

- [ ] **Step 5: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 6: Smoke test (manual)**

In the editor of Default:
- The 9 blocks render in order. Drag "FIELD_PHONE" above "FIELD_NAME"; the order updates and auto-save fires.
- Click the eye icon on "FIELD_REFERENCE"; it dims (visible=false). Click again to restore.
- Click the pencil on "FIELD_ADDRESS"; the slide-in panel opens with Título / Marcador / Mensaje de error / toggles. Edit "Título" and close; auto-save fires.
- Click "+ Agregar nuevos campos"; select "Email"; it appears in the list right before SUBMIT_BUTTON.
- Click the trash icon on "FIELD_EMAIL"; confirm; it disappears.
- Trash and pencil are disabled on SUBMIT_BUTTON.

- [ ] **Step 7: Commit**

```
git add components/admin/cod-forms/BlocksList.tsx components/admin/cod-forms/SortableBlockItem.tsx components/admin/cod-forms/AddBlockSelector.tsx components/admin/cod-forms/BlockEditPanel.tsx
git commit -m "feat(cod-forms): blocks list with drag-drop, add selector, and edit panel"
```

---

## Phase 6 — Storefront block renderer

### Task 17: Implement structural block components

**Files:**
- Create: `components/shop/cod-form/blocks/HeaderBlock.tsx`
- Create: `components/shop/cod-form/blocks/CartItemsBlock.tsx`
- Create: `components/shop/cod-form/blocks/ShippingOptionsBlock.tsx`
- Create: `components/shop/cod-form/blocks/OrderSummaryBlock.tsx`
- Create: `components/shop/cod-form/blocks/SubmitButtonBlock.tsx`

- [ ] **Step 1: Create the HeaderBlock**

```tsx
// components/shop/cod-form/blocks/HeaderBlock.tsx
"use client"

import type { HeaderContent } from "@/lib/cod-forms/types"

export default function HeaderBlock({ content }: { content: HeaderContent }) {
  return (
    <div
      style={{
        textAlign: content.align,
        fontSize: `${content.fontSize}px`,
        fontWeight: content.fontWeight,
        fontStyle: content.fontStyle,
        color: content.color,
      }}
    >
      {content.text}
    </div>
  )
}
```

- [ ] **Step 2: Create the CartItemsBlock**

```tsx
// components/shop/cod-form/blocks/CartItemsBlock.tsx
"use client"

import Image from "next/image"
import type { CartItemsContent } from "@/lib/cod-forms/types"
import { Minus, Plus } from "lucide-react"

export type CartItem = {
  productName: string
  variantName: string | null
  quantity: number
  unitPrice: number
  thumbnailUrl: string | null
}

export default function CartItemsBlock({
  content,
  items,
  onQuantityChange,
}: {
  content: CartItemsContent
  items: CartItem[]
  onQuantityChange?: (idx: number, q: number) => void
}) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 border rounded p-2">
          {content.showThumbnail && it.thumbnailUrl && (
            <div className="relative w-12 h-12 shrink-0">
              <Image src={it.thumbnailUrl} alt="" fill className="object-cover rounded" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{it.productName}</p>
            {content.showVariant && it.variantName && (
              <p className="text-xs text-muted-foreground truncate">{it.variantName}</p>
            )}
          </div>
          {content.showQuantitySelector && onQuantityChange ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onQuantityChange(i, Math.max(1, it.quantity - 1))}
                className="p-1 border rounded"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm">{it.quantity}</span>
              <button
                type="button"
                onClick={() => onQuantityChange(i, it.quantity + 1)}
                className="p-1 border rounded"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <span className="text-sm">x{it.quantity}</span>
          )}
          <span className="text-sm font-medium ml-2">
            S/ {(it.unitPrice * it.quantity).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create the ShippingOptionsBlock**

```tsx
// components/shop/cod-form/blocks/ShippingOptionsBlock.tsx
"use client"

import type { ShippingOptionsContent } from "@/lib/cod-forms/types"

export type ShippingOption = {
  id: string
  label: string
  price: number  // 0 = free
}

export default function ShippingOptionsBlock({
  content,
  options,
  selectedId,
  onSelect,
}: {
  content: ShippingOptionsContent
  options: ShippingOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const filtered = content.showFreeShipping
    ? options
    : options.filter((o) => o.price > 0)

  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground">No hay opciones de envío disponibles</p>
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Opciones de envío</p>
      {filtered.map((o) => (
        <label
          key={o.id}
          className="flex items-center justify-between border rounded p-2 cursor-pointer hover:bg-muted/30"
        >
          <span className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="shipping-option"
              checked={selectedId === o.id}
              onChange={() => onSelect(o.id)}
            />
            {o.label}
          </span>
          <span className="text-sm font-medium">
            {o.price === 0 ? "Gratis" : `S/ ${o.price.toFixed(2)}`}
          </span>
        </label>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create the OrderSummaryBlock**

```tsx
// components/shop/cod-form/blocks/OrderSummaryBlock.tsx
"use client"

import type { OrderSummaryContent } from "@/lib/cod-forms/types"

export type OrderTotals = {
  subtotal: number
  discount: number
  shipping: number
  total: number
}

export default function OrderSummaryBlock({
  content,
  totals,
}: {
  content: OrderSummaryContent
  totals: OrderTotals
}) {
  return (
    <div className="border rounded p-3 space-y-1 text-sm bg-muted/20">
      {content.showSubtotal && (
        <Row label="Subtotal" value={`S/ ${totals.subtotal.toFixed(2)}`} />
      )}
      {content.showDiscount && totals.discount > 0 && (
        <Row label="Descuento" value={`-S/ ${totals.discount.toFixed(2)}`} valueClass="text-red-600" />
      )}
      {content.showShipping && (
        <Row
          label="Envío"
          value={totals.shipping === 0 ? "Gratis" : `S/ ${totals.shipping.toFixed(2)}`}
        />
      )}
      {content.showTotal && (
        <Row label="Total" value={`S/ ${totals.total.toFixed(2)}`} bold />
      )}
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold border-t pt-1 mt-1" : ""}`}>
      <span>{label}</span>
      <span className={valueClass ?? ""}>{value}</span>
    </div>
  )
}
```

- [ ] **Step 5: Create the SubmitButtonBlock**

```tsx
// components/shop/cod-form/blocks/SubmitButtonBlock.tsx
"use client"

import * as Lucide from "lucide-react"
import type { ButtonStyle } from "@/lib/cod-forms/types"

const SHADOW_CLASSES = [
  "shadow-none",
  "shadow-sm",
  "shadow-sm",
  "shadow",
  "shadow",
  "shadow-md",
  "shadow-md",
  "shadow-lg",
  "shadow-lg",
  "shadow-xl",
  "shadow-2xl",
]

const ANIMATION_CLASSES: Record<ButtonStyle["animation"], string> = {
  none: "",
  pulse: "animate-pulse",
  shake: "animate-bounce", // closest tailwind built-in
  bounce: "animate-bounce",
}

export default function SubmitButtonBlock({
  text,
  style,
  disabled,
  onClick,
}: {
  text: string
  style: ButtonStyle
  disabled?: boolean
  onClick?: () => void
}) {
  const Icon =
    style.icon && (Lucide as any)[style.icon]
      ? ((Lucide as any)[style.icon] as React.ComponentType<{ className?: string }>)
      : null

  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex flex-col items-center justify-center gap-1 px-4 py-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${SHADOW_CLASSES[Math.min(10, Math.max(0, style.shadow ?? 0))]} ${ANIMATION_CLASSES[style.animation]}`}
      style={{
        color: style.textColor,
        backgroundColor: style.bgColor,
        borderColor: style.borderColor,
        borderWidth: `${style.borderWidth}px`,
        borderStyle: style.borderWidth > 0 ? "solid" : "none",
        borderRadius: `${style.borderRadius}px`,
        fontSize: `${style.fontSize}px`,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
      }}
    >
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4" />}
        {text}
      </span>
      {style.subtitle && (
        <span className="text-xs opacity-80">{style.subtitle}</span>
      )}
    </button>
  )
}
```

- [ ] **Step 6: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```
git add components/shop/cod-form/blocks
git commit -m "feat(cod-forms): structural block components for storefront renderer"
```

---

### Task 18: Implement FieldBlock + CodFormBlockRenderer

**Files:**
- Create: `components/shop/cod-form/blocks/FieldBlock.tsx`
- Create: `components/shop/cod-form/CodFormBlockRenderer.tsx`

- [ ] **Step 1: Create FieldBlock**

```tsx
// components/shop/cod-form/blocks/FieldBlock.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CodFormBlockType, FieldContent } from "@/lib/cod-forms/types"

const TEXTAREA_TYPES: CodFormBlockType[] = [
  "FIELD_REFERENCE",
  "FIELD_NOTES",
]

const HTML_INPUT_TYPE: Partial<Record<CodFormBlockType, string>> = {
  FIELD_EMAIL: "email",
  FIELD_PHONE: "tel",
  FIELD_DNI: "text",
}

export default function FieldBlock({
  type,
  content,
  required,
  value,
  errorMessage,
  onChange,
}: {
  type: CodFormBlockType
  content: FieldContent
  required: boolean
  value: string
  errorMessage: string | null
  onChange: (v: string) => void
}) {
  const isTextarea = TEXTAREA_TYPES.includes(type)
  const inputType = HTML_INPUT_TYPE[type] ?? "text"

  return (
    <div className="space-y-1">
      {!content.hideLabel && (
        <Label className="text-xs">
          {content.label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      )}
      {isTextarea ? (
        <Textarea
          placeholder={content.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <Input
          type={inputType}
          placeholder={content.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}
      {errorMessage && <p className="text-xs text-red-600">{errorMessage}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create CodFormBlockRenderer**

```tsx
// components/shop/cod-form/CodFormBlockRenderer.tsx
"use client"

import HeaderBlock from "./blocks/HeaderBlock"
import CartItemsBlock, { type CartItem } from "./blocks/CartItemsBlock"
import ShippingOptionsBlock, {
  type ShippingOption,
} from "./blocks/ShippingOptionsBlock"
import OrderSummaryBlock, { type OrderTotals } from "./blocks/OrderSummaryBlock"
import SubmitButtonBlock from "./blocks/SubmitButtonBlock"
import FieldBlock from "./blocks/FieldBlock"
import type {
  CodFormBlock,
  CodFormBlockType,
  HeaderContent,
  CartItemsContent,
  ShippingOptionsContent,
  OrderSummaryContent,
  FieldContent,
  ButtonStyle,
} from "@/lib/cod-forms/types"

export type RendererContext = {
  buttonText: string
  buttonStyle: ButtonStyle
  cartItems: CartItem[]
  totals: OrderTotals
  shippingOptions: ShippingOption[]
  selectedShippingId: string | null
  onShippingSelect: (id: string) => void
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string | null>
  onFieldChange: (type: CodFormBlockType, value: string) => void
  submitDisabled?: boolean
  onSubmit?: () => void
  onQuantityChange?: (idx: number, q: number) => void
}

const FIELD_TYPES: ReadonlySet<CodFormBlockType> = new Set([
  "FIELD_NAME",
  "FIELD_PHONE",
  "FIELD_EMAIL",
  "FIELD_DNI",
  "FIELD_ADDRESS",
  "FIELD_ADDRESS_2",
  "FIELD_PROVINCE",
  "FIELD_CITY",
  "FIELD_REFERENCE",
  "FIELD_NOTES",
])

export default function CodFormBlockRenderer({
  blocks,
  ctx,
}: {
  blocks: CodFormBlock[]
  ctx: RendererContext
}) {
  return (
    <div className="space-y-3">
      {blocks
        .filter((b) => b.visible)
        .map((b) => {
          if (b.type === "HEADER") {
            return <HeaderBlock key={b.id} content={b.content as HeaderContent} />
          }
          if (b.type === "CART_ITEMS") {
            return (
              <CartItemsBlock
                key={b.id}
                content={b.content as CartItemsContent}
                items={ctx.cartItems}
                onQuantityChange={ctx.onQuantityChange}
              />
            )
          }
          if (b.type === "SHIPPING_OPTIONS") {
            return (
              <ShippingOptionsBlock
                key={b.id}
                content={b.content as ShippingOptionsContent}
                options={ctx.shippingOptions}
                selectedId={ctx.selectedShippingId}
                onSelect={ctx.onShippingSelect}
              />
            )
          }
          if (b.type === "ORDER_SUMMARY") {
            return (
              <OrderSummaryBlock
                key={b.id}
                content={b.content as OrderSummaryContent}
                totals={ctx.totals}
              />
            )
          }
          if (b.type === "SUBMIT_BUTTON") {
            return (
              <SubmitButtonBlock
                key={b.id}
                text={ctx.buttonText}
                style={ctx.buttonStyle}
                disabled={ctx.submitDisabled}
                onClick={ctx.onSubmit}
              />
            )
          }
          if (FIELD_TYPES.has(b.type)) {
            return (
              <FieldBlock
                key={b.id}
                type={b.type}
                content={b.content as FieldContent}
                required={b.required}
                value={ctx.fieldValues[b.type] ?? ""}
                errorMessage={ctx.fieldErrors[b.type] ?? null}
                onChange={(v) => ctx.onFieldChange(b.type, v)}
              />
            )
          }
          return null
        })}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add components/shop/cod-form/blocks/FieldBlock.tsx components/shop/cod-form/CodFormBlockRenderer.tsx
git commit -m "feat(cod-forms): field block + master block renderer"
```

---

### Task 19: Implement `PreviewPanel` (admin) using mock data

**Files:**
- Modify: `components/admin/cod-forms/PreviewPanel.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
// components/admin/cod-forms/PreviewPanel.tsx
"use client"

import { useMemo, useState } from "react"
import CodFormBlockRenderer, {
  type RendererContext,
} from "@/components/shop/cod-form/CodFormBlockRenderer"
import { useCodFormEditor } from "./store"
import type { CodFormBlockType } from "@/lib/cod-forms/types"
import { resolveTemplateVariables } from "@/lib/cod-forms/template-variables"

const MOCK_ITEM = {
  productName: "Producto de ejemplo",
  variantName: "Variante",
  quantity: 1,
  unitPrice: 99.9,
  thumbnailUrl: null,
}

const MOCK_SHIPPING = [
  { id: "free", label: "Envío gratis", price: 0 },
  { id: "lima", label: "Envío estándar Lima", price: 10 },
]

export default function PreviewPanel() {
  const blocks = useCodFormEditor((s) => s.blocks)
  const buttonText = useCodFormEditor((s) => s.buttonText)
  const buttonStyle = useCodFormEditor((s) => s.buttonStyle)

  const [fieldValues] = useState<Record<string, string>>({})
  const [shipId, setShipId] = useState("free")

  const subtotal = MOCK_ITEM.unitPrice * MOCK_ITEM.quantity
  const shipping = MOCK_SHIPPING.find((s) => s.id === shipId)?.price ?? 0
  const total = subtotal + shipping

  const ctx: RendererContext = useMemo(
    () => ({
      buttonText: resolveTemplateVariables(buttonText, {
        total: `S/ ${total.toFixed(2)}`,
        producto: MOCK_ITEM.productName,
      }),
      buttonStyle,
      cartItems: [MOCK_ITEM],
      totals: { subtotal, discount: 0, shipping, total },
      shippingOptions: MOCK_SHIPPING,
      selectedShippingId: shipId,
      onShippingSelect: setShipId,
      fieldValues,
      fieldErrors: {},
      onFieldChange: () => {
        // Preview is read-only — ignore field input.
      },
      submitDisabled: true,
    }),
    [buttonText, buttonStyle, fieldValues, shipId, subtotal, shipping, total],
  )

  return (
    <div className="max-w-md mx-auto bg-white border rounded-lg p-4">
      <p className="text-xs uppercase font-medium text-muted-foreground mb-3">
        Vista previa en vivo
      </p>
      <CodFormBlockRenderer blocks={blocks} ctx={ctx} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Smoke test (manual)**

Open the editor of Default. Verify:
- The right panel shows a mocked form with the encabezado, items, opciones de envío, resumen, fields and submit button.
- Editing the button text reflects in the preview at the toke.
- Changing the button color in `ButtonStyleEditor` updates the preview button color instantly.
- Toggling visibility of "Resumen del pedido" hides the summary section in the preview.
- Reordering blocks updates the preview order.
- Variable `{total}` in the button text renders as "S/ 99.90".

- [ ] **Step 4: Commit**

```
git add components/admin/cod-forms/PreviewPanel.tsx
git commit -m "feat(cod-forms): instant client-side preview panel with mock data"
```

---

## Phase 7 — Storefront integration

### Task 20: Create `PostSubmitView` (post-confirm UI)

**Files:**
- Create: `components/shop/cod-form/PostSubmitView.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/shop/cod-form/PostSubmitView.tsx
"use client"

import { CheckCircle2 } from "lucide-react"

export default function PostSubmitView({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4 space-y-3">
      <CheckCircle2 className="h-12 w-12 text-green-500" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground whitespace-pre-line">{message}</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add components/shop/cod-form/PostSubmitView.tsx
git commit -m "feat(cod-forms): post-submit view component"
```

---

### Task 21: Update product page query to include `codFormTemplate` + `shippingRestriction`

**Files:**
- Modify: `app/(shop)/productos/[slug]/page.tsx`

- [ ] **Step 1: Locate the Prisma query** that loads the product. Add to its `include` block:

```typescript
codFormTemplate: {
  include: {
    blocks: { orderBy: { position: "asc" } },
    thankYouPage: { select: { slug: true } },
  },
},
```

- [ ] **Step 2: Locate where the page passes the product to its template view component(s)** (`ProductStandardView`, `ProductLandingView`). Pass the template along:

```tsx
<ProductStandardView
  product={product}
  codFormTemplate={product.codFormTemplate}
  shippingRestriction={product.shippingRestriction}
  // ... other props
/>
```

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: type errors in `ProductStandardView` / `ProductLandingView` (props don't yet exist). That's OK — we fix them next.

- [ ] **Step 4: Commit**

```
git add "app/(shop)/productos/[slug]/page.tsx"
git commit -m "feat(cod-forms): include codFormTemplate in product page query"
```

---

### Task 22: Update `CodOrderModal` to render template blocks + post-submit views

**Files:**
- Modify: `components/shop/CodOrderModal.tsx`

- [ ] **Step 1: Replace the existing rendering with the block-driven flow**

Read the existing `CodOrderModal.tsx` and apply these changes. Replace the body so it:
- Accepts a `template: CodFormTemplateData | null` prop.
- Maintains local state: `fieldValues`, `fieldErrors`, `selectedShippingId`, `submitting`, `submitted`.
- On submit, calls the existing `actions/cod-orders.ts` action passing the field values + selected shipping.
- After a successful submit, renders the appropriate post-submit view based on `template.postSubmitAction`.

Skeleton:

```tsx
// components/shop/CodOrderModal.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import CodFormBlockRenderer, {
  type RendererContext,
} from "./cod-form/CodFormBlockRenderer"
import PostSubmitView from "./cod-form/PostSubmitView"
import { resolveTemplateVariables } from "@/lib/cod-forms/template-variables"
import { createCodOrder } from "@/actions/cod-orders"
import type { CodFormTemplateData, CodFormBlockType } from "@/lib/cod-forms/types"
import type { ShippingRestriction } from "@/lib/cod-forms/types"
import { validateShippingRestriction } from "@/lib/products/shipping-restriction"

export type CodOrderModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: {
    id: string
    name: string
    basePrice: number
    images: string[]
  }
  template: CodFormTemplateData
  shippingRestriction: ShippingRestriction | null
  shippingOptions: { id: string; label: string; price: number }[]
}

export default function CodOrderModal({
  open,
  onOpenChange,
  product,
  template,
  shippingRestriction,
  shippingOptions,
}: CodOrderModalProps) {
  const router = useRouter()
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({})
  const [selectedShipping, setSelectedShipping] = useState<string | null>(
    shippingOptions[0]?.id ?? null,
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const subtotal = product.basePrice
  const shipping =
    shippingOptions.find((s) => s.id === selectedShipping)?.price ?? 0
  const totals = { subtotal, discount: 0, shipping, total: subtotal + shipping }

  const onFieldChange = (type: CodFormBlockType, value: string) => {
    setFieldValues((s) => ({ ...s, [type]: value }))
    setFieldErrors((s) => ({ ...s, [type]: null }))
  }

  const validate = (): boolean => {
    const errors: Record<string, string | null> = {}
    for (const b of template.blocks) {
      if (!b.required || !b.visible) continue
      if (!b.type.startsWith("FIELD_")) continue
      const v = (fieldValues[b.type] ?? "").trim()
      if (!v) {
        const c = b.content as { errorMessage?: string }
        errors[b.type] = c.errorMessage || "Campo obligatorio"
      }
    }
    // NOTE: FIELD_PROVINCE / FIELD_CITY are simple text inputs in this version.
    // For real shipping-restriction enforcement, the implementer should hook
    // these fields to a `getDepartments` / `getProvinces` / `getDistricts` chain
    // (see `actions/locations.ts`) and store the IDs/codes in fieldValues
    // alongside the display strings. Below we read them as IDs/codes:
    if (shippingRestriction) {
      const restrictionErr = validateShippingRestriction(shippingRestriction, {
        departmentId: null, // assigned by the location selector implementation
        provinceId: fieldValues["FIELD_PROVINCE"] ?? null,
        districtCode: fieldValues["FIELD_CITY"] ?? null,
      })
      if (restrictionErr) {
        errors["FIELD_CITY"] = restrictionErr
      }
    }
    setFieldErrors(errors)
    return Object.values(errors).every((e) => !e)
  }

  const onSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await createCodOrder({
        productId: product.id,
        templateId: template.id,
        fields: fieldValues,
        shippingOptionId: selectedShipping,
      })

      // Handle post-submit action
      if (template.postSubmitAction === "WHATSAPP_REDIRECT" && template.whatsappNumber) {
        const msg = resolveTemplateVariables(template.whatsappMessage ?? "", {
          nombre: fieldValues["FIELD_NAME"],
          telefono: fieldValues["FIELD_PHONE"],
          direccion: fieldValues["FIELD_ADDRESS"],
          distrito: fieldValues["FIELD_CITY"],
          total: `S/ ${totals.total.toFixed(2)}`,
          producto: product.name,
          pedido: result.orderId,
          referencia: fieldValues["FIELD_REFERENCE"],
        })
        const url = `https://wa.me/${template.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
        window.open(url, "_blank", "noopener,noreferrer")
        setSubmitted(true)
      } else if (template.postSubmitAction === "THANK_YOU_PAGE" && template.thankYouPageSlug) {
        onOpenChange(false)
        router.push(`/${template.thankYouPageSlug}`)
        return
      } else {
        setSubmitted(true)
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error al confirmar el pedido")
    } finally {
      setSubmitting(false)
    }
  }

  const ctx: RendererContext = {
    buttonText: resolveTemplateVariables(template.buttonText, {
      total: `S/ ${totals.total.toFixed(2)}`,
      producto: product.name,
    }),
    buttonStyle: template.buttonStyle,
    cartItems: [
      {
        productName: product.name,
        variantName: null,
        quantity: 1,
        unitPrice: product.basePrice,
        thumbnailUrl: product.images[0] ?? null,
      },
    ],
    totals,
    shippingOptions,
    selectedShippingId: selectedShipping,
    onShippingSelect: setSelectedShipping,
    fieldValues,
    fieldErrors,
    onFieldChange,
    submitDisabled: submitting,
    onSubmit,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{product.name}</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <PostSubmitView
            title={
              resolveTemplateVariables(template.thankYouTitle ?? "¡Gracias por tu pedido!", {
                producto: product.name,
              })
            }
            message={resolveTemplateVariables(
              template.thankYouMessage ?? "Nos comunicaremos contigo pronto.",
              {
                nombre: fieldValues["FIELD_NAME"] ?? "",
                producto: product.name,
              },
            )}
          />
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onSubmit()
              }}
            >
              <CodFormBlockRenderer blocks={template.blocks} ctx={ctx} />
            </form>
            {submitError && (
              <p className="text-sm text-red-600 mt-2">{submitError}</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Update `actions/cod-orders.ts` signature**

The existing action accepted `codFormSettings`. Change the signature to accept what `CodOrderModal` now sends:

```typescript
// actions/cod-orders.ts (signature update only — body details follow project conventions)
export async function createCodOrder(input: {
  productId: string
  templateId: string
  fields: Record<string, string>
  shippingOptionId: string | null
}): Promise<{ orderId: string }> {
  // ... existing logic adapted to:
  //   - read template by id
  //   - validate productId.shippingRestriction (re-use lib/products/shipping-restriction.ts; created in Phase 8)
  //   - read individual fields from input.fields["FIELD_NAME"], etc.
  //   - create Order with PaymentMethod = COD as before
  // Returns the new orderId.
}
```

> The internal logic of order creation stays the same — only the input shape changes. Read the current `actions/cod-orders.ts` and adapt field reads accordingly. Keep all existing validation and side effects (inventory, etc.).

- [ ] **Step 3: Update `ProductActions.tsx`** to pass the new props

Find where `<CodOrderModal>` is rendered in `components/shop/ProductActions.tsx`. Replace the old `codFormSettings` prop with:

```tsx
<CodOrderModal
  open={codOpen}
  onOpenChange={setCodOpen}
  product={{
    id: product.id,
    name: product.name,
    basePrice: Number(product.basePrice),
    images: product.images as string[],
  }}
  template={product.codFormTemplate}
  shippingRestriction={product.shippingRestriction as ShippingRestriction | null}
  shippingOptions={shippingOptions}
/>
```

(`shippingOptions` should already be available in `ProductActions` — if not, fetch them from the existing shipping data flow.)

- [ ] **Step 4: Update `ProductStandardView.tsx` and `ProductLandingView.tsx`**

These two pass props down to `ProductActions`. Change their props signatures so they accept and forward `codFormTemplate` and `shippingRestriction` from the page query (Task 21).

For example, in `ProductStandardView.tsx`:

```tsx
type Props = {
  product: ProductWithRelations
  codFormTemplate: CodFormTemplateData | null
  shippingRestriction: ShippingRestriction | null
  // ... existing props
}
```

Pass these down to `<ProductActions>`.

- [ ] **Step 5: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 6: Smoke test (manual)**

In the browser, on a product whose `checkoutMode` is COD_AND_CART (you may need to set this manually in `/admin/productos/<id>` after Phase 9, or directly via Prisma Studio for now):
- Click "Comprar al recibir" → modal opens with the Default template's blocks.
- Try to submit empty: required fields show the red error message.
- Fill in required fields, submit: post-submit view appears with the thank-you message.
- Switch the template to `WHATSAPP_REDIRECT` (via Prisma Studio for now): submit opens `wa.me` in a new tab, then shows the thank-you view.

- [ ] **Step 7: Commit**

```
git add components/shop/CodOrderModal.tsx actions/cod-orders.ts components/shop/ProductActions.tsx components/shop/templates/ProductStandardView.tsx components/shop/templates/ProductLandingView.tsx
git commit -m "feat(cod-forms): storefront renders template blocks + handles post-submit"
```

---

## Phase 8 — Shipping restriction at product level

### Task 23: Create shared validation function

**Files:**
- Create: `lib/products/shipping-restriction.ts`

- [ ] **Step 1: Create the validator**

```typescript
// lib/products/shipping-restriction.ts
import type { ShippingRestriction } from "@/lib/cod-forms/types"

export type Location = {
  departmentId: string | null
  provinceId: string | null
  districtCode: string | null
}

/**
 * Returns null when the location is allowed, or the restrictionMessage
 * (or a generic fallback) when blocked.
 *
 * Logic:
 *  - If restriction.enabled is false → always allowed.
 *  - If allowedDistrictCodes is non-empty → districtCode must be in it.
 *  - Else if allowedProvinceIds is non-empty → provinceId must be in it.
 *  - Else if allowedDepartmentIds is non-empty → departmentId must be in it.
 *  - Else (all empty) → allowed.
 */
export function validateShippingRestriction(
  restriction: ShippingRestriction | null,
  loc: Location,
): string | null {
  if (!restriction || !restriction.enabled) return null

  const fail = (): string =>
    restriction.restrictionMessage ??
    "Este producto no se envía a la ubicación seleccionada."

  if (restriction.allowedDistrictCodes.length > 0) {
    if (!loc.districtCode) return fail()
    return restriction.allowedDistrictCodes.includes(loc.districtCode) ? null : fail()
  }
  if (restriction.allowedProvinceIds.length > 0) {
    if (!loc.provinceId) return fail()
    return restriction.allowedProvinceIds.includes(loc.provinceId) ? null : fail()
  }
  if (restriction.allowedDepartmentIds.length > 0) {
    if (!loc.departmentId) return fail()
    return restriction.allowedDepartmentIds.includes(loc.departmentId) ? null : fail()
  }
  return null
}
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add lib/products/shipping-restriction.ts
git commit -m "feat(products): shared shipping restriction validator"
```

---

### Task 24: Validate `shippingRestriction` in the standard checkout flow

**Files:**
- Modify: `actions/orders.ts`

- [ ] **Step 1: Read the existing checkout flow** in `actions/orders.ts`. Identify where the order is being assembled and where products are fetched.

- [ ] **Step 2: Inside the order creation, after products are fetched, add validation**

For each product in the cart:

```typescript
import { validateShippingRestriction } from "@/lib/products/shipping-restriction"
import type { ShippingRestriction } from "@/lib/cod-forms/types"

// Inside the order-creation transaction, after `products` are loaded and the
// shipping address is known:
for (const item of cartItems) {
  const product = products.find((p) => p.id === item.productId)
  if (!product) continue
  const restriction = (product.shippingRestriction ?? null) as ShippingRestriction | null
  const err = validateShippingRestriction(restriction, {
    departmentId: shippingAddress.departmentId,
    provinceId: shippingAddress.provinceId,
    districtCode: shippingAddress.districtCode,
  })
  if (err) {
    throw new Error(`${product.name}: ${err}`)
  }
}
```

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add actions/orders.ts
git commit -m "feat(orders): enforce product.shippingRestriction in standard checkout"
```

---

## Phase 9 — Integración con formulario de producto (admin)

### Task 25: Create `ShippingRestrictionCard` (replaces shipping settings inside CodFormConfig)

**Files:**
- Create: `components/admin/products/ShippingRestrictionCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// components/admin/products/ShippingRestrictionCard.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import {
  getDepartments,
  getProvincesByDepartment,
  getDistrictsByProvince,
} from "@/actions/locations"
import type { ShippingRestriction } from "@/lib/cod-forms/types"

const EMPTY: ShippingRestriction = {
  enabled: false,
  allowedDepartmentIds: [],
  allowedProvinceIds: [],
  allowedDistrictCodes: [],
  restrictionMessage: null,
}

export default function ShippingRestrictionCard({
  value,
  onChange,
}: {
  value: ShippingRestriction | null
  onChange: (v: ShippingRestriction | null) => void
}) {
  const restriction = value ?? EMPTY
  const [allDepts, setAllDepts] = useState<{ id: string; name: string }[]>([])
  const [allProvs, setAllProvs] = useState<{ id: string; name: string }[]>([])
  const [allDists, setAllDists] = useState<{ code: string; name: string }[]>([])
  const [loadingProvs, setLoadingProvs] = useState(false)
  const [loadingDists, setLoadingDists] = useState(false)

  useEffect(() => {
    getDepartments().then((r) => {
      if (r.success) setAllDepts(r.data)
    })
  }, [])

  useEffect(() => {
    if (!restriction.allowedDepartmentIds.length) {
      setAllProvs([])
      setAllDists([])
      return
    }
    setLoadingProvs(true)
    Promise.all(
      restriction.allowedDepartmentIds.map((id) => getProvincesByDepartment(id)),
    ).then((results) => {
      setAllProvs(results.flatMap((r) => (r.success ? r.data : [])))
      setLoadingProvs(false)
    })
  }, [restriction.allowedDepartmentIds.join(",")])

  useEffect(() => {
    if (!restriction.allowedProvinceIds.length) {
      setAllDists([])
      return
    }
    setLoadingDists(true)
    Promise.all(
      restriction.allowedProvinceIds.map((id) => getDistrictsByProvince(id)),
    ).then((results) => {
      setAllDists(results.flatMap((r) => (r.success ? r.data : [])))
      setLoadingDists(false)
    })
  }, [restriction.allowedProvinceIds.join(",")])

  const update = (patch: Partial<ShippingRestriction>) =>
    onChange({ ...restriction, ...patch })

  const toggleDept = (id: string) => {
    const next = restriction.allowedDepartmentIds.includes(id)
      ? restriction.allowedDepartmentIds.filter((x) => x !== id)
      : [...restriction.allowedDepartmentIds, id]
    update({
      allowedDepartmentIds: next,
      allowedProvinceIds: [],
      allowedDistrictCodes: [],
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Cobertura de envío</span>
          <Switch
            checked={restriction.enabled}
            onCheckedChange={(v) => update({ enabled: v })}
          />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Limita los departamentos / provincias / distritos a los que se puede
          enviar este producto. Aplica al carrito normal y al formulario COD.
        </p>
      </CardHeader>
      {restriction.enabled && (
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Mensaje informativo (opcional)</Label>
            <Input
              value={restriction.restrictionMessage ?? ""}
              onChange={(e) => update({ restrictionMessage: e.target.value || null })}
              placeholder="Solo hacemos envíos a Lima"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Departamentos permitidos</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Sin selección = acepta todos
            </p>
            <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
              {allDepts.length === 0 ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                allDepts.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={restriction.allowedDepartmentIds.includes(d.id)}
                      onChange={() => toggleDept(d.id)}
                      className="rounded"
                    />
                    {d.name}
                  </label>
                ))
              )}
            </div>
          </div>
          {restriction.allowedDepartmentIds.length > 0 && (
            <ProvincePicker
              loading={loadingProvs}
              all={allProvs}
              selected={restriction.allowedProvinceIds}
              onToggle={(id) => {
                const next = restriction.allowedProvinceIds.includes(id)
                  ? restriction.allowedProvinceIds.filter((x) => x !== id)
                  : [...restriction.allowedProvinceIds, id]
                update({ allowedProvinceIds: next, allowedDistrictCodes: [] })
              }}
            />
          )}
          {restriction.allowedProvinceIds.length > 0 && (
            <DistrictPicker
              loading={loadingDists}
              all={allDists}
              selected={restriction.allowedDistrictCodes}
              onToggle={(code) => {
                const next = restriction.allowedDistrictCodes.includes(code)
                  ? restriction.allowedDistrictCodes.filter((x) => x !== code)
                  : [...restriction.allowedDistrictCodes, code]
                update({ allowedDistrictCodes: next })
              }}
            />
          )}
        </CardContent>
      )}
    </Card>
  )
}

function ProvincePicker({
  loading,
  all,
  selected,
  onToggle,
}: {
  loading: boolean
  all: { id: string; name: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <Label className="text-xs font-semibold">Provincias permitidas (opcional)</Label>
      <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          all.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
            >
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => onToggle(p.id)}
                className="rounded"
              />
              {p.name}
            </label>
          ))
        )}
      </div>
    </div>
  )
}

function DistrictPicker({
  loading,
  all,
  selected,
  onToggle,
}: {
  loading: boolean
  all: { code: string; name: string }[]
  selected: string[]
  onToggle: (code: string) => void
}) {
  return (
    <div>
      <Label className="text-xs font-semibold">Distritos permitidos (opcional)</Label>
      <div className="max-h-36 overflow-y-auto border rounded-lg p-2 space-y-0.5 bg-white">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          all.map((d) => (
            <label
              key={d.code}
              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded"
            >
              <input
                type="checkbox"
                checked={selected.includes(d.code)}
                onChange={() => onToggle(d.code)}
                className="rounded"
              />
              {d.name}
            </label>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```
git add components/admin/products/ShippingRestrictionCard.tsx
git commit -m "feat(products): shipping restriction card for admin product form"
```

---

### Task 26: Create `CodFormTemplateCard` (replaces inline `CodFormConfig` in product form)

**Files:**
- Create: `components/admin/products/CodFormTemplateCard.tsx`

- [ ] **Step 1: Add a server action that lists template options for the dropdown**

In `actions/cod-form-templates.ts`, append:

```typescript
export async function listTemplateOptions(): Promise<
  { id: string; name: string; isDefault: boolean }[]
> {
  // Read-only: any authenticated admin can fetch this for the dropdown.
  const { response } = await requirePermission("cod-forms.view")
  if (response) return []
  return prisma.codFormTemplate.findMany({
    select: { id: true, name: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  })
}
```

- [ ] **Step 2: Create the card component**

```tsx
// components/admin/products/CodFormTemplateCard.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Star, ExternalLink } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { listTemplateOptions } from "@/actions/cod-form-templates"
import type { CheckoutMode } from "@prisma/client"

type Option = { id: string; name: string; isDefault: boolean }

export default function CodFormTemplateCard({
  checkoutMode,
  templateId,
  onChange,
}: {
  checkoutMode: CheckoutMode
  templateId: string | null
  onChange: (patch: { checkoutMode?: CheckoutMode; codFormTemplateId?: string | null }) => void
}) {
  const [options, setOptions] = useState<Option[]>([])

  useEffect(() => {
    listTemplateOptions().then(setOptions)
  }, [])

  const showsTemplateSelector = checkoutMode !== "STANDARD"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Modo de checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <RadioGroup
          value={checkoutMode}
          onValueChange={(v) => onChange({ checkoutMode: v as CheckoutMode })}
        >
          <Row value="STANDARD" label="Carrito normal (sin COD)" />
          <Row value="COD_AND_CART" label="Carrito + Pago Contra Entrega" />
          <Row value="COD_ONLY" label="Solo Pago Contra Entrega" />
        </RadioGroup>

        {showsTemplateSelector && (
          <div className="border-t pt-3">
            <Label className="text-xs">Plantilla COD</Label>
            <select
              className="w-full border rounded h-9 px-2 text-sm"
              value={templateId ?? ""}
              onChange={(e) =>
                onChange({ codFormTemplateId: e.target.value || null })
              }
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.isDefault ? "★ " : ""}
                  {o.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/formularios-cod"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              Gestionar plantillas
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <RadioGroupItem value={value} />
      <span className="text-sm">{label}</span>
    </label>
  )
}
```

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add components/admin/products/CodFormTemplateCard.tsx actions/cod-form-templates.ts
git commit -m "feat(cod-forms): product-form template selector card"
```

---

### Task 27: Replace inline `CodFormConfig` in `NewProductForm` and `EditProductForm`

**Files:**
- Modify: `components/admin/NewProductForm.tsx`
- Modify: `components/admin/EditProductForm.tsx`

- [ ] **Step 1: Update `NewProductForm.tsx`**

Remove the import of `CodFormConfig` and `DEFAULT_COD_FORM_SETTINGS`. Add:

```tsx
import CodFormTemplateCard from "@/components/admin/products/CodFormTemplateCard"
import ShippingRestrictionCard from "@/components/admin/products/ShippingRestrictionCard"
import type { ShippingRestriction } from "@/lib/cod-forms/types"
```

In the form state initial values:
- Remove `codFormSettings: DEFAULT_COD_FORM_SETTINGS as CodFormSettings`.
- Add:

```typescript
codFormTemplateId: null as string | null,
shippingRestriction: null as ShippingRestriction | null,
```

Replace the JSX block:

```tsx
{(formData.checkoutMode === "COD_ONLY" || formData.checkoutMode === "COD_AND_CART") && (
  <CodFormConfig
    settings={formData.codFormSettings as CodFormSettings}
    onChange={(s) => setFormData({ ...formData, codFormSettings: s })}
  />
)}
```

with:

```tsx
<CodFormTemplateCard
  checkoutMode={formData.checkoutMode}
  templateId={formData.codFormTemplateId}
  onChange={(patch) => setFormData({ ...formData, ...patch })}
/>
<ShippingRestrictionCard
  value={formData.shippingRestriction}
  onChange={(v) => setFormData({ ...formData, shippingRestriction: v })}
/>
```

(Remove the obsolete radio group around `checkoutMode` if `CodFormTemplateCard` now owns it.)

- [ ] **Step 2: Update the submit handler**

When the form posts to `/api/admin/products/create`, replace the `codFormSettings` field with `codFormTemplateId` + `shippingRestriction`.

- [ ] **Step 3: Repeat the same changes in `EditProductForm.tsx`**

Read existing values from `product.codFormTemplateId` and `product.shippingRestriction` instead of `codFormSettings`.

- [ ] **Step 4: Update `app/api/admin/products/create/route.ts` and `[productId]/update/route.ts`**

In both:
- Remove `codFormSettings` from the Zod schema.
- Add `codFormTemplateId: z.string().nullable().optional()` and `shippingRestriction: shippingRestrictionSchema.nullable().optional()` (importing from `lib/cod-forms/schema`).
- After parsing, if `checkoutMode != STANDARD` and `codFormTemplateId == null`, fetch the Default template id and use it.
- Persist both fields on the Prisma create/update call.

```typescript
// Inside the create handler, after parsing the body:
let templateId = body.codFormTemplateId ?? null
if (body.checkoutMode && body.checkoutMode !== "STANDARD" && !templateId) {
  const def = await prisma.codFormTemplate.findFirst({
    where: { isDefault: true },
    select: { id: true },
  })
  templateId = def?.id ?? null
}

await prisma.product.create({
  data: {
    // ... existing fields
    codFormTemplateId: templateId,
    shippingRestriction: body.shippingRestriction ?? null,
    // remove codFormSettings entirely
  },
})
```

- [ ] **Step 5: Update `lib/validations.ts`** if it includes `codFormSettings` in the product schema. Replace it with the same fields.

- [ ] **Step 6: Update `actions/products-import.ts`** (CSV import). Search for `codFormSettings` references and remove them; the importer should leave `codFormTemplateId` null (the API handler will auto-assign Default).

- [ ] **Step 7: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 8: Smoke test (manual)**

In `/admin/productos/nuevo`:
- Set Modo de checkout = "Carrito + COD"; the dropdown of plantillas appears with "★ Default" preselected.
- Configure the Cobertura de envío card: enable, choose Lima only.
- Save the product → check the DB: `codFormTemplateId` is set, `shippingRestriction` is the JSON object with the chosen options.

In `/admin/productos/<id>`:
- Open an existing product. Switch its plantilla to a custom one. Save. Reload — the new plantilla persists.

- [ ] **Step 9: Commit**

```
git add components/admin/NewProductForm.tsx components/admin/EditProductForm.tsx app/api/admin/products lib/validations.ts actions/products-import.ts
git commit -m "feat(products): replace inline CodFormConfig with template selector + shipping restriction card"
```

---

## Phase 10 — Bulk assign + tab "Productos asignados"

### Task 28: Extend `BulkEditModal` with template + checkoutMode fields

**Files:**
- Modify: `components/admin/BulkEditModal.tsx`

- [ ] **Step 1: Read the existing `BulkEditModal.tsx`** to understand the form-state pattern.

- [ ] **Step 2: Add two new fields to its state**

```typescript
codFormTemplateId: null as string | null | "no-change",
checkoutMode: "no-change" as CheckoutMode | "no-change",
```

Default both to `"no-change"` (sentinel meaning "do not modify").

- [ ] **Step 3: Add UI controls inside the modal**

```tsx
import { listTemplateOptions } from "@/actions/cod-form-templates"
// (and useEffect/useState hooks already present)

const [tplOpts, setTplOpts] = useState<{ id: string; name: string }[]>([])
useEffect(() => {
  listTemplateOptions().then((opts) =>
    setTplOpts(opts.map((o) => ({ id: o.id, name: o.isDefault ? "★ " + o.name : o.name }))),
  )
}, [])

// JSX inside the form:
<div>
  <Label className="text-xs">Plantilla COD</Label>
  <select
    className="w-full border rounded h-9 px-2 text-sm"
    value={state.codFormTemplateId ?? "no-change"}
    onChange={(e) =>
      setState((s) => ({
        ...s,
        codFormTemplateId: e.target.value === "no-change" ? "no-change" : e.target.value,
      }))
    }
  >
    <option value="no-change">— Sin cambios —</option>
    {tplOpts.map((o) => (
      <option key={o.id} value={o.id}>{o.name}</option>
    ))}
  </select>
</div>
<div>
  <Label className="text-xs">Modo de checkout</Label>
  <select
    className="w-full border rounded h-9 px-2 text-sm"
    value={state.checkoutMode}
    onChange={(e) => setState((s) => ({ ...s, checkoutMode: e.target.value as any }))}
  >
    <option value="no-change">— Sin cambios —</option>
    <option value="STANDARD">Carrito normal</option>
    <option value="COD_AND_CART">Carrito + COD</option>
    <option value="COD_ONLY">Solo COD</option>
  </select>
</div>
```

- [ ] **Step 4: Update the bulk submit handler**

When the user clicks "Aplicar":

```typescript
import { assignTemplateToProducts } from "@/actions/cod-form-templates"

if (state.codFormTemplateId && state.codFormTemplateId !== "no-change") {
  await assignTemplateToProducts(
    state.codFormTemplateId,
    selectedProductIds,
    state.checkoutMode !== "no-change" ? state.checkoutMode : undefined,
  )
} else if (state.checkoutMode !== "no-change") {
  // Only changing checkoutMode — call a separate bulk action.
  // Inline equivalent (no new action needed):
  await prisma.product.updateMany({
    where: { id: { in: selectedProductIds } },
    data: { checkoutMode: state.checkoutMode },
  })
}
```

The Prisma call from the client doesn't work — wrap it inside an existing or new server action. If `actions/products.ts` already has a `bulkUpdate` action, extend it. Otherwise, add a small server action `bulkSetCheckoutMode(productIds, mode)` mirroring `assignTemplateToProducts`.

- [ ] **Step 5: Show confirmation dialog**

Before applying, show a `confirm("Asignar plantilla X a 12 productos. ¿Confirmas?")` (or a custom Dialog) summarizing the changes.

- [ ] **Step 6: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 7: Smoke test (manual)**

In `/admin/productos`: select 3 products → "Editar masivo" → set Plantilla = "Default" + Modo = "Carrito + COD" → Aplicar → confirm. Refresh; the 3 products show the new plantilla and checkoutMode.

- [ ] **Step 8: Commit**

```
git add components/admin/BulkEditModal.tsx
git commit -m "feat(products): bulk assign cod template + checkout mode"
```

---

### Task 29: Add "Productos asignados" tab inside the editor

**Files:**
- Create: `components/admin/cod-forms/AssignedProductsTab.tsx`
- Create: `components/admin/cod-forms/AssignProductsModal.tsx`
- Modify: `components/admin/cod-forms/CodFormEditor.tsx`

- [ ] **Step 1: Add a new server action to list/search products for the modal**

In `actions/cod-form-templates.ts`, append:

```typescript
export async function listProductsForTemplate(templateId: string) {
  const { response } = await requirePermission("cod-forms.view")
  if (response) throw new Error("Forbidden")

  return prisma.product.findMany({
    where: { codFormTemplateId: templateId },
    select: { id: true, name: true, slug: true, basePrice: true },
    orderBy: { name: "asc" },
  })
}

export async function searchProductsToAssign(query: string) {
  const { response } = await requirePermission("cod-forms.update")
  if (response) throw new Error("Forbidden")

  const q = query.trim()
  return prisma.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    select: {
      id: true,
      name: true,
      slug: true,
      codFormTemplateId: true,
    },
    take: 50,
    orderBy: { name: "asc" },
  })
}
```

- [ ] **Step 2: Create `AssignProductsModal.tsx`**

```tsx
// components/admin/cod-forms/AssignProductsModal.tsx
"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"
import {
  searchProductsToAssign,
  assignTemplateToProducts,
} from "@/actions/cod-form-templates"
import { toast } from "sonner"

type Hit = {
  id: string
  name: string
  slug: string
  codFormTemplateId: string | null
}

export default function AssignProductsModal({
  templateId,
  open,
  onClose,
  onAssigned,
}: {
  templateId: string
  open: boolean
  onClose: () => void
  onAssigned: () => void
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [searching, setSearching] = useState(false)

  const onSearch = () => {
    setSearching(true)
    searchProductsToAssign(query)
      .then(setHits)
      .finally(() => setSearching(false))
  }

  const togglePick = (id: string) => {
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onApply = () => {
    if (picked.size === 0) return
    if (!confirm(`Asignar plantilla a ${picked.size} producto(s)?`)) return
    startTransition(async () => {
      try {
        await assignTemplateToProducts(templateId, Array.from(picked))
        toast.success("Plantilla asignada")
        onAssigned()
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al asignar")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar productos</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          <Button variant="outline" onClick={onSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-1 mt-3">
          {hits.map((h) => (
            <label
              key={h.id}
              className="flex items-center gap-2 p-2 border rounded text-sm hover:bg-muted/30"
            >
              <input
                type="checkbox"
                checked={picked.has(h.id)}
                onChange={() => togglePick(h.id)}
              />
              <span className="flex-1">{h.name}</span>
              {h.codFormTemplateId === templateId && (
                <span className="text-xs text-muted-foreground">ya asignado</span>
              )}
            </label>
          ))}
          {hits.length === 0 && !searching && (
            <p className="text-sm text-muted-foreground">Busca para empezar.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onApply} disabled={pending || picked.size === 0}>
            Asignar ({picked.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create `AssignedProductsTab.tsx`**

```tsx
// components/admin/cod-forms/AssignedProductsTab.tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import {
  listProductsForTemplate,
  unassignProductsFromTemplate,
} from "@/actions/cod-form-templates"
import AssignProductsModal from "./AssignProductsModal"
import { toast } from "sonner"

type Row = {
  id: string
  name: string
  slug: string
  basePrice: any
}

export default function AssignedProductsTab({ templateId }: { templateId: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    listProductsForTemplate(templateId)
      .then(setRows)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [templateId])

  const onUnassign = async (id: string) => {
    if (!confirm("Quitar este producto de la plantilla? Se reasignará a Default.")) return
    try {
      await unassignProductsFromTemplate(templateId, [id])
      toast.success("Producto reasignado a Default")
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  return (
    <section className="border rounded-lg bg-white">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-medium text-sm">Productos asignados ({rows.length})</span>
        <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Asignar productos
        </Button>
      </div>
      <div className="p-3 space-y-1">
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Ningún producto usa esta plantilla.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 p-2 border rounded text-sm">
            <span className="flex-1 truncate">{r.name}</span>
            <span className="text-xs text-muted-foreground">/{r.slug}</span>
            <Button variant="ghost" size="icon" onClick={() => onUnassign(r.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <AssignProductsModal
        templateId={templateId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAssigned={reload}
      />
    </section>
  )
}
```

- [ ] **Step 4: Mount `AssignedProductsTab` in the editor below `BlocksList`**

In `components/admin/cod-forms/CodFormEditor.tsx`, add the import and render it inside the left aside:

```tsx
import AssignedProductsTab from "./AssignedProductsTab"
// ...
<aside className="w-1/2 overflow-y-auto border-r p-4 space-y-4">
  <ButtonStyleEditor />
  <BlocksList />
  <AssignedProductsTab templateId={template.id} />
</aside>
```

- [ ] **Step 5: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 6: Smoke test (manual)**

Open the editor of any non-Default template:
- The "Productos asignados" section appears below the form blocks.
- Click "Asignar productos" → search "camiseta" → check 2 products → "Asignar (2)". Toast confirms; the list updates.
- Click the X next to a product → confirm → it's reassigned to Default and removed from the list.

- [ ] **Step 7: Commit**

```
git add components/admin/cod-forms/AssignedProductsTab.tsx components/admin/cod-forms/AssignProductsModal.tsx components/admin/cod-forms/CodFormEditor.tsx actions/cod-form-templates.ts
git commit -m "feat(cod-forms): assigned products tab in editor"
```

---

## Phase 11 — Cleanup y migración contract

### Task 30: Remove obsolete `lib/types/cod-form.ts` and `CodFormConfig.tsx`

**Files:**
- Modify: `lib/types/cod-form.ts`
- Delete: `components/admin/CodFormConfig.tsx`

- [ ] **Step 1: Search for remaining references**

```
Grep "CodFormSettings|codFormSettings|CodFormConfig|DEFAULT_COD_FORM_SETTINGS" in repo
```

Expected: only this file (`lib/types/cod-form.ts`), the deleted file (`CodFormConfig.tsx`), and the spec/plan documents. If any other file references these symbols, fix them first (they should have been updated in Phase 9).

- [ ] **Step 2: Replace `lib/types/cod-form.ts` with a re-export shim**

```typescript
// lib/types/cod-form.ts
// Re-exports from the new home so deep imports keep working until updated.
export type {
  CodFormBlock,
  CodFormBlockType,
  CodFormTemplateData,
  ButtonStyle,
  PostSubmitAction,
  ShippingRestriction,
  HeaderContent,
  FieldContent,
  CartItemsContent,
  ShippingOptionsContent,
  OrderSummaryContent,
  SubmitButtonContent,
} from "@/lib/cod-forms/types"
```

(Optionally delete the file outright, but only after confirming no `from "@/lib/types/cod-form"` imports remain.)

- [ ] **Step 3: Delete `components/admin/CodFormConfig.tsx`**

```
git rm components/admin/CodFormConfig.tsx
```

- [ ] **Step 4: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```
git add lib/types/cod-form.ts
git commit -m "refactor(cod-forms): remove legacy CodFormConfig + cod-form types"
```

---

### Task 31: Drop `Product.codFormSettings` column (migration 2 — contract)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_drop_product_cod_form_settings/migration.sql`

> Run this only AFTER deploying everything above to production and confirming the new flow works end-to-end. This is a separate PR.

- [ ] **Step 1: Remove the line** `codFormSettings Json?` from `model Product` in `prisma/schema.prisma`.

- [ ] **Step 2: Generate migration**

```
npx prisma migrate dev --name drop_product_cod_form_settings
```

Expected: a new SQL file with `ALTER TABLE "Product" DROP COLUMN "codFormSettings";`.

- [ ] **Step 3: Verify build**

```
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(cod-forms): drop legacy Product.codFormSettings column"
```

---

## Phase 12 — Final verification

### Task 32: End-to-end manual smoke test

- [ ] **Step 1: Reset to a clean dev DB and run the deploy sequence**

```
npx prisma migrate deploy
npx tsx scripts/setup-cod-forms-permissions.ts
npx tsx scripts/seed-cod-form-default.ts
npm run build
npm run dev
```

Expected: build PASS, dev server boots without errors.

- [ ] **Step 2: Walk through the full user journey**

Verify in the browser:

**Admin journey:**
- `/admin/formularios-cod` shows Default template.
- Click Default → editor opens with 9 blocks. Auto-save indicator works.
- Open the engranaje popover → switch to WHATSAPP_REDIRECT → fill number "+51999999999" → close → reload page → action persists.
- In `ButtonStyleEditor`, change button bg color → preview updates instantly.
- Drag FIELD_PHONE above FIELD_NAME → preview reflects new order.
- Click FIELD_REFERENCE eye → preview hides it.
- Click FIELD_NAME pencil → edit Título to "Tu nombre" → close → preview updates.
- Click "+ Agregar nuevos campos" → add FIELD_EMAIL → it appears before SUBMIT_BUTTON.
- Try to delete SUBMIT_BUTTON → button is disabled.
- Go back to list → Duplicate Default → new "Default (copia)" appears, can be deleted.

**Storefront COD journey (product with checkoutMode = COD_AND_CART):**
- Visit `/productos/<slug>` → click "Pago Contra Entrega" → modal opens with template blocks.
- Submit empty → required field errors appear.
- Fill required fields → submit → INLINE_THANK_YOU message shows (form disappears).
- Switch product's plantilla to one with WHATSAPP_REDIRECT → submit → wa.me opens in new tab + thank-you view shows in modal.
- Switch product's plantilla to one with THANK_YOU_PAGE → submit → modal closes, navigates to the configured page slug.

**Standard checkout shipping restriction:**
- Pick a product, configure `shippingRestriction` to allow only Lima.
- Cart-checkout: try to ship to Arequipa → server action throws expected error.
- Cart-checkout: ship to Lima → succeeds.

**Bulk assign:**
- `/admin/productos` → select 3 products → Editar masivo → choose plantilla "Default (copia)" + Modo "Carrito + COD" → confirm.
- Reload `/admin/formularios-cod/<id>` → tab "Productos asignados" lists the 3 products.

- [ ] **Step 3: Inspect Prisma to confirm data integrity**

```
npx prisma studio
```

Verify:
- Default template exists with `isDefault: true`.
- All products with `checkoutMode != STANDARD` have `codFormTemplateId` set.
- Products with restricted shipping have `shippingRestriction` populated.
- No row still has `codFormSettings` populated (column was dropped — confirm via `\d "Product"` in psql or Prisma Studio's Product schema view).

- [ ] **Step 4: Final commit if any tweaks were needed**

```
git add -A
git commit -m "chore(cod-forms): post-deploy verification fixes"
```

---

## Out of scope (V2)

These items were in the spec's section 8 ("Out of scope") and are intentionally NOT covered by this plan:

- Multi-país (selector de países en el editor).
- URL externa para `THANK_YOU_PAGE` (solo se permiten `Page` del sitio).
- Variables de plantilla custom definidas por el admin.
- A/B testing de plantillas.
- Versionado de plantillas / historial / rollback.
- Bloques custom por producto (overrides).
- Restricción geográfica a nivel categoría.

