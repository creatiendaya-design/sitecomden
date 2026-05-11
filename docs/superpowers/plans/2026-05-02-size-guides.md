# Size Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract size guides from `CustomizableTemplate` into a standalone `SizeGuide` model, manageable from a new admin section, assignable per product, and visible in both the public product page and the customizer.

**Architecture:** New top-level `SizeGuide` Prisma model with `Product.sizeGuideId` FK. Admin CRUD at `/admin/guia-tallas`. Single shared `SizeGuideModal` (sheet) used by `ProductOptions` (storefront) and `ProductTab` (customizer). Expand-contract migration: ship new system + idempotent script that copies data from `CustomizableTemplate.sizeGuide` to `SizeGuide` rows; drop the legacy column in a separate post-deploy PR.

**Tech Stack:** Next.js App Router · Prisma 6 (PostgreSQL/Neon) · TypeScript · Zod · Radix Dialog · Tailwind v4 · Zustand (existing customizer store) · Vercel Blob upload (`/api/upload`).

**Source spec:** [docs/superpowers/specs/2026-05-02-size-guides-design.md](../specs/2026-05-02-size-guides-design.md)

---

## File Structure

### New files
```
prisma/migrations/<ts>_add_size_guides/migration.sql
lib/size-guides/types.ts                       # SizeGuideData, Tab, Marker, Column, Row, Table
lib/size-guides/schema.ts                      # Zod schemas (validate + infer)
actions/size-guides.ts                         # CRUD server actions
scripts/setup-size-guides-permissions.ts       # RBAC seeder
scripts/migrate-customizable-size-guides.ts    # data migration
app/admin/guia-tallas/page.tsx                 # list page
app/admin/guia-tallas/nueva/page.tsx           # create page
app/admin/guia-tallas/[id]/page.tsx            # edit page
components/admin/size-guides/SizeGuidesList.tsx
components/admin/size-guides/SizeGuideForm.tsx
components/admin/size-guides/SizeGuideTabsEditor.tsx
components/admin/size-guides/SizeGuideMarkersEditor.tsx
components/admin/size-guides/SizeGuideTableEditor.tsx
components/admin/products/SizeGuideCard.tsx
components/shop/size-guide/format-cell.ts
components/shop/size-guide/SizeGuideTable.tsx
components/shop/size-guide/SizeGuideTabContent.tsx
components/shop/size-guide/SizeGuideModal.tsx
components/shop/size-guide/SizeGuideButton.tsx
prisma/migrations/<ts>_drop_customizable_template_size_guide/migration.sql  # phase 8
```

### Modified files
```
prisma/schema.prisma                                              # add SizeGuide, SizeUnit, Product.sizeGuideId
lib/permissions.ts                                                # add 4 size-guides:* slugs
lib/validations.ts                                                # add sizeGuideId to updateProductSchema + createProductSchema
app/admin/layout.tsx                                              # sidebar item
app/api/admin/products/create/route.ts                            # accept sizeGuideId
app/api/admin/products/[productId]/update/route.ts                # accept sizeGuideId
components/admin/EditProductForm.tsx                              # mount <SizeGuideCard>
components/admin/NewProductForm.tsx                               # mount <SizeGuideCard>
components/admin/customizer-templates/TemplateForm.tsx            # remove SizeGuideEditor card
app/(shop)/productos/[slug]/page.tsx                              # include sizeGuide
components/shop/ProductOptions.tsx                                # render <SizeGuideButton>
app/(customizer)/productos/[slug]/personalizar/page.tsx           # include sizeGuide
components/customizer/CustomizerLayout.tsx                        # BuilderProduct.sizeGuide
components/customizer/LeftSidebar/ProductTab.tsx                  # use SizeGuideModal w/ product.sizeGuide
components/customizer/store.ts                                    # template type loses sizeGuide
lib/customizer/types.ts                                           # remove SizeGuide / SizeGuideRow
actions/customizer.ts                                             # drop sizeGuide from schema + reads
actions/__tests__/customizer.test.ts                              # update fixtures
components/customizer/__tests__/store.test.ts                     # update fixtures
```

### Deleted files (phase 8 cleanup)
```
components/admin/customizer-templates/SizeGuideEditor.tsx
components/customizer/LeftSidebar/SizeGuideDrawer.tsx
```

---

## Phase 1 — Modelo de datos y tipos

### Task 1: Add `SizeGuide` model + `Product.sizeGuideId` to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma` (around line 1319 where `CustomizableTemplate` lives, and around line 93 where `Product` lives)

- [ ] **Step 1: Insert the new enum + model after `CustomizableTemplate`**

In `prisma/schema.prisma`, after the `CustomizableTemplate` model (around line 1337), insert:

```prisma
enum SizeUnit {
  CM
  IN
}

model SizeGuide {
  id        String    @id @default(cuid())
  name      String
  unit      SizeUnit  @default(CM)
  tabs      Json      @default("[]")
  table     Json      @default("{}")
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  products  Product[]

  @@index([active])
}
```

- [ ] **Step 2: Add `sizeGuideId` FK to `Product`**

In the `Product` model (around line 93), inside the relations block, add:

```prisma
  sizeGuideId String?
  sizeGuide   SizeGuide? @relation(fields: [sizeGuideId], references: [id], onDelete: SetNull)
```

And add an index in the existing `@@index` block:

```prisma
  @@index([sizeGuideId])
```

- [ ] **Step 3: Generate Prisma client**

Run: `npx prisma generate`
Expected: prints `✔ Generated Prisma Client`. No errors.

- [ ] **Step 4: Verify TypeScript still builds**

Run: `npm run build`
Expected: build succeeds (it now exposes `prisma.sizeGuide` and `Product.sizeGuide`).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add SizeGuide model + Product.sizeGuideId FK"
```

---

### Task 2: Generate Prisma migration "expand"

**Files:**
- Create: `prisma/migrations/<timestamp>_add_size_guides/migration.sql`

- [ ] **Step 1: Create the migration via Prisma CLI**

Run: `npx prisma migrate dev --name add_size_guides --create-only`
Expected: creates a new folder `prisma/migrations/<timestamp>_add_size_guides/` with `migration.sql` containing the expected DDL (CREATE TYPE SizeUnit, CREATE TABLE SizeGuide, ALTER TABLE Product, CREATE INDEX, ADD CONSTRAINT FK).

- [ ] **Step 2: Verify the migration SQL is correct**

Open the generated `migration.sql`. It must contain:
```sql
CREATE TYPE "SizeUnit" AS ENUM ('CM', 'IN');
CREATE TABLE "SizeGuide" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" "SizeUnit" NOT NULL DEFAULT 'CM',
  "tabs" JSONB NOT NULL DEFAULT '[]',
  "table" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SizeGuide_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SizeGuide_active_idx" ON "SizeGuide"("active");
ALTER TABLE "Product" ADD COLUMN "sizeGuideId" TEXT;
CREATE INDEX "Product_sizeGuideId_idx" ON "Product"("sizeGuideId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_sizeGuideId_fkey"
  FOREIGN KEY ("sizeGuideId") REFERENCES "SizeGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

`CustomizableTemplate.sizeGuide` must NOT appear (no DROP yet).

- [ ] **Step 3: Apply migration to local DB**

Run: `npx prisma migrate dev`
Expected: `Database schema is up to date.`

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(db): migration — add size_guides table"
```

---

### Task 3: Create `lib/size-guides/types.ts`

**Files:**
- Create: `lib/size-guides/types.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/size-guides/types.ts

export type SizeUnit = "cm" | "in";

export interface SizeGuideMarker {
  key: string;
  label: string;
  description: string;
}

export interface SizeGuideTab {
  id: string;
  title: string;
  imageUrl: string | null;
  intro: string | null;
  markers: SizeGuideMarker[];
}

export interface SizeGuideColumn {
  key: string;
  label: string;
}

export interface SizeGuideRow {
  size: string;
  values: Record<string, number>;
  overrides?: Record<string, string>;
}

export interface SizeGuideTable {
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
}

export interface SizeGuideData {
  id: string;
  name: string;
  unit: SizeUnit;
  tabs: SizeGuideTab[];
  table: SizeGuideTable;
  active: boolean;
}

export interface SizeGuideListItem {
  id: string;
  name: string;
  unit: SizeUnit;
  active: boolean;
  productCount: number;
  updatedAt: Date;
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/size-guides/types.ts
git commit -m "feat(size-guides): add types"
```

---

### Task 4: Create `lib/size-guides/schema.ts` (Zod)

**Files:**
- Create: `lib/size-guides/schema.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/size-guides/schema.ts
import { z } from "zod";

export const sizeUnitSchema = z.enum(["cm", "in"]);

export const sizeGuideMarkerSchema = z.object({
  key: z.string().min(1).max(8),
  label: z.string().min(1).max(60),
  description: z.string().max(2000),
});

export const sizeGuideTabSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  imageUrl: z.string().url().nullable(),
  intro: z.string().max(2000).nullable(),
  markers: z.array(sizeGuideMarkerSchema).max(20),
});

export const sizeGuideColumnSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
});

export const sizeGuideRowSchema = z.object({
  size: z.string().min(1).max(20),
  values: z.record(z.string(), z.number()),
  overrides: z.record(z.string(), z.string()).optional(),
});

export const sizeGuideTableSchema = z.object({
  columns: z.array(sizeGuideColumnSchema).max(20),
  rows: z.array(sizeGuideRowSchema).max(50),
});

export const sizeGuideDataSchema = z.object({
  name: z.string().min(1).max(120),
  unit: sizeUnitSchema,
  tabs: z.array(sizeGuideTabSchema).max(8),
  table: sizeGuideTableSchema,
  active: z.boolean(),
});

export type SizeGuideInput = z.infer<typeof sizeGuideDataSchema>;
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/size-guides/schema.ts
git commit -m "feat(size-guides): add zod schemas"
```

---

## Phase 2 — Server actions + permisos

### Task 5: Add new permissions to `lib/permissions.ts`

**Files:**
- Modify: `lib/permissions.ts`

- [ ] **Step 1: Locate the existing permission slug list and add 4 new entries**

Find the existing list of permission slugs in `lib/permissions.ts`. Add these to the same list (alphabetical insertion, near `pages:*` or whatever group is closest):

```ts
"size-guides:view",
"size-guides:create",
"size-guides:update",
"size-guides:delete",
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat(rbac): register size-guides:* permissions"
```

---

### Task 6: Create RBAC setup script

**Files:**
- Create: `scripts/setup-size-guides-permissions.ts`

- [ ] **Step 1: Use an existing setup script as template**

Read `scripts/setup-pages-permissions.ts` for reference on the project's pattern (Prisma client + role lookup + `permission.upsert` + `rolePermission.upsert`).

- [ ] **Step 2: Write the new script**

```ts
// scripts/setup-size-guides-permissions.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { slug: "size-guides:view", name: "Ver guías de tallas", minLevel: 3 },
  { slug: "size-guides:create", name: "Crear guías de tallas", minLevel: 5 },
  { slug: "size-guides:update", name: "Editar guías de tallas", minLevel: 5 },
  { slug: "size-guides:delete", name: "Eliminar guías de tallas", minLevel: 10 },
];

async function main() {
  // Upsert each permission
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { name: p.name },
      create: { slug: p.slug, name: p.name },
    });
    console.log(`✓ permission ${p.slug}`);
  }

  // Grant to roles by minLevel
  const roles = await prisma.role.findMany();
  for (const role of roles) {
    for (const p of PERMISSIONS) {
      if (role.level < p.minLevel) continue;
      const permission = await prisma.permission.findUniqueOrThrow({ where: { slug: p.slug } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log("✓ size-guides permissions assigned to roles");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Run the script locally**

Run: `npx tsx scripts/setup-size-guides-permissions.ts`
Expected: 4 `✓ permission …` lines + final `✓ size-guides permissions assigned to roles`. Open Prisma Studio (`npx prisma studio`) and confirm the rows exist in `Permission` and `RolePermission`.

- [ ] **Step 4: Commit**

```bash
git add scripts/setup-size-guides-permissions.ts
git commit -m "chore(rbac): script to seed size-guides permissions"
```

---

### Task 7: Create `actions/size-guides.ts` server actions

**Files:**
- Create: `actions/size-guides.ts`

- [ ] **Step 1: Write the file**

```ts
// actions/size-guides.ts
"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sizeGuideDataSchema } from "@/lib/size-guides/schema";
import type {
  SizeGuideData,
  SizeGuideListItem,
  SizeGuideTab,
  SizeGuideTable,
} from "@/lib/size-guides/types";
import type { SizeUnit as PrismaSizeUnit, Prisma } from "@prisma/client";

function dbUnitToTs(u: PrismaSizeUnit): "cm" | "in" {
  return u === "IN" ? "in" : "cm";
}
function tsUnitToDb(u: "cm" | "in"): PrismaSizeUnit {
  return u === "in" ? "IN" : "CM";
}

function rowToData(row: {
  id: string;
  name: string;
  unit: PrismaSizeUnit;
  tabs: Prisma.JsonValue;
  table: Prisma.JsonValue;
  active: boolean;
}): SizeGuideData {
  return {
    id: row.id,
    name: row.name,
    unit: dbUnitToTs(row.unit),
    tabs: (row.tabs as unknown as SizeGuideTab[]) ?? [],
    table: (row.table as unknown as SizeGuideTable) ?? { columns: [], rows: [] },
    active: row.active,
  };
}

export async function listSizeGuides(): Promise<
  | { success: true; data: SizeGuideListItem[] }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:view");
  if (response) return { success: false, error: "No autorizado" };

  const rows = await prisma.sizeGuide.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      unit: dbUnitToTs(r.unit),
      active: r.active,
      productCount: r._count.products,
      updatedAt: r.updatedAt,
    })),
  };
}

export async function listActiveSizeGuides(): Promise<
  | { success: true; data: { id: string; name: string; unit: "cm" | "in" }[] }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:view");
  if (response) return { success: false, error: "No autorizado" };

  const rows = await prisma.sizeGuide.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true },
  });

  return {
    success: true,
    data: rows.map((r) => ({ id: r.id, name: r.name, unit: dbUnitToTs(r.unit) })),
  };
}

export async function getSizeGuide(id: string): Promise<
  | { success: true; data: SizeGuideData }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:view");
  if (response) return { success: false, error: "No autorizado" };

  const row = await prisma.sizeGuide.findUnique({ where: { id } });
  if (!row) return { success: false, error: "Guía no encontrada" };
  return { success: true, data: rowToData(row) };
}

export async function createSizeGuide(input: unknown): Promise<
  | { success: true; data: { id: string } }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:create");
  if (response) return { success: false, error: "No autorizado" };

  const parsed = sizeGuideDataSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const created = await prisma.sizeGuide.create({
    data: {
      name: parsed.data.name,
      unit: tsUnitToDb(parsed.data.unit),
      tabs: parsed.data.tabs as unknown as Prisma.InputJsonValue,
      table: parsed.data.table as unknown as Prisma.InputJsonValue,
      active: parsed.data.active,
    },
  });

  revalidatePath("/admin/guia-tallas");
  return { success: true, data: { id: created.id } };
}

export async function updateSizeGuide(id: string, input: unknown): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:update");
  if (response) return { success: false, error: "No autorizado" };

  const parsed = sizeGuideDataSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  await prisma.sizeGuide.update({
    where: { id },
    data: {
      name: parsed.data.name,
      unit: tsUnitToDb(parsed.data.unit),
      tabs: parsed.data.tabs as unknown as Prisma.InputJsonValue,
      table: parsed.data.table as unknown as Prisma.InputJsonValue,
      active: parsed.data.active,
    },
  });

  revalidatePath("/admin/guia-tallas");
  revalidatePath(`/admin/guia-tallas/${id}`);
  return { success: true };
}

export async function deleteSizeGuide(id: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:delete");
  if (response) return { success: false, error: "No autorizado" };

  await prisma.sizeGuide.delete({ where: { id } });
  revalidatePath("/admin/guia-tallas");
  return { success: true };
}

export async function duplicateSizeGuide(id: string): Promise<
  | { success: true; data: { id: string } }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:create");
  if (response) return { success: false, error: "No autorizado" };

  const orig = await prisma.sizeGuide.findUnique({ where: { id } });
  if (!orig) return { success: false, error: "Guía no encontrada" };

  const copy = await prisma.sizeGuide.create({
    data: {
      name: `${orig.name} (copia)`,
      unit: orig.unit,
      tabs: orig.tabs as Prisma.InputJsonValue,
      table: orig.table as Prisma.InputJsonValue,
      active: false, // copias arrancan inactivas
    },
  });

  revalidatePath("/admin/guia-tallas");
  return { success: true, data: { id: copy.id } };
}

export async function toggleSizeGuideActive(id: string): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const { response } = await requirePermission("size-guides:update");
  if (response) return { success: false, error: "No autorizado" };

  const row = await prisma.sizeGuide.findUnique({ where: { id }, select: { active: true } });
  if (!row) return { success: false, error: "Guía no encontrada" };
  await prisma.sizeGuide.update({ where: { id }, data: { active: !row.active } });

  revalidatePath("/admin/guia-tallas");
  return { success: true };
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add actions/size-guides.ts
git commit -m "feat(size-guides): server actions (CRUD + duplicate + toggle)"
```

---

## Phase 3 — Admin CRUD UI

### Task 8: Add sidebar item

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Add `Ruler` to the lucide imports**

Open `app/admin/layout.tsx` (around line 7-32 where lucide imports are). Add `Ruler` to the imported names:

```diff
-import {
-  LayoutDashboard,
-  ShoppingCart,
+import {
+  LayoutDashboard,
+  ShoppingCart,
+  Ruler,
```

- [ ] **Step 2: Insert the new nav item**

In the `navItems` array (around line 138-142, where `/admin/personalizables` is registered), insert immediately after the Personalizables entry and before Páginas:

```ts
    {
      href: "/admin/guia-tallas",
      icon: Ruler,
      label: "Guía de Tallas",
    },
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Open `http://localhost:3000/admin/dashboard`. Look at the sidebar — the new "Guía de Tallas" item appears between Personalizables and Páginas. Clicking it routes to `/admin/guia-tallas` (404 expected for now).

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): sidebar item for size guides"
```

---

### Task 9: Create the listing page

**Files:**
- Create: `app/admin/guia-tallas/page.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/admin/guia-tallas/page.tsx
import { protectRoute } from "@/lib/protect-route";
import { listSizeGuides } from "@/actions/size-guides";
import { SizeGuidesList } from "@/components/admin/size-guides/SizeGuidesList";

export const dynamic = "force-dynamic";

export default async function SizeGuidesPage() {
  await protectRoute("size-guides:view");

  const result = await listSizeGuides();
  if (!result.success) {
    return <p className="text-red-600">{result.error}</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Guías de Tallas</h1>
      </header>
      <SizeGuidesList items={result.data} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds (compiler warns about missing component — fixed in next task).

- [ ] **Step 3: Commit**

```bash
git add app/admin/guia-tallas/page.tsx
git commit -m "feat(admin): size guides list page"
```

---

### Task 10: Create `SizeGuidesList` component

**Files:**
- Create: `components/admin/size-guides/SizeGuidesList.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/admin/size-guides/SizeGuidesList.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Copy, Trash2, Plus } from "lucide-react";
import {
  deleteSizeGuide,
  duplicateSizeGuide,
  toggleSizeGuideActive,
} from "@/actions/size-guides";
import type { SizeGuideListItem } from "@/lib/size-guides/types";

interface Props {
  items: SizeGuideListItem[];
}

export function SizeGuidesList({ items }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onDelete = (item: SizeGuideListItem) => {
    const msg =
      item.productCount > 0
        ? `${item.productCount} producto(s) perderán su guía de tallas. ¿Continuar?`
        : "¿Eliminar esta guía?";
    if (!confirm(msg)) return;
    start(async () => {
      const r = await deleteSizeGuide(item.id);
      if (r.success) {
        toast.success("Guía eliminada");
        router.refresh();
      } else toast.error(r.error);
    });
  };

  const onDuplicate = (item: SizeGuideListItem) => {
    start(async () => {
      const r = await duplicateSizeGuide(item.id);
      if (r.success) {
        toast.success("Guía duplicada");
        router.push(`/admin/guia-tallas/${r.data.id}`);
      } else toast.error(r.error);
    });
  };

  const onToggle = (item: SizeGuideListItem) => {
    start(async () => {
      const r = await toggleSizeGuideActive(item.id);
      if (r.success) router.refresh();
      else toast.error(r.error);
    });
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex justify-end p-3 border-b">
        <Button asChild size="sm">
          <Link href="/admin/guia-tallas/nueva">
            <Plus className="mr-1 size-4" /> Nueva guía
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground p-6 text-center">
          Aún no hay guías de tallas.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2">Productos</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2 font-medium">
                  <Link
                    href={`/admin/guia-tallas/${item.id}`}
                    className="hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                <td className="px-3 py-2 uppercase text-muted-foreground">
                  {item.unit}
                </td>
                <td className="px-3 py-2">{item.productCount}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onToggle(item)}
                    disabled={pending}
                    className={
                      item.active
                        ? "text-green-700"
                        : "text-muted-foreground"
                    }
                  >
                    {item.active ? "● Activa" : "○ Inactiva"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right space-x-1">
                  <Button asChild size="icon" variant="ghost">
                    <Link href={`/admin/guia-tallas/${item.id}`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onDuplicate(item)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Visit `http://localhost:3000/admin/guia-tallas`.
Expected: empty state message visible, "+ Nueva guía" button visible. No console errors.
Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add components/admin/size-guides/SizeGuidesList.tsx
git commit -m "feat(admin): size guides list component"
```

---

### Task 11: Create the create/edit pages

**Files:**
- Create: `app/admin/guia-tallas/nueva/page.tsx`
- Create: `app/admin/guia-tallas/[id]/page.tsx`

- [ ] **Step 1: Create the "nueva" page**

```tsx
// app/admin/guia-tallas/nueva/page.tsx
import { protectRoute } from "@/lib/protect-route";
import { SizeGuideForm } from "@/components/admin/size-guides/SizeGuideForm";

export const dynamic = "force-dynamic";

export default async function NewSizeGuidePage() {
  await protectRoute("size-guides:create");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Nueva guía de tallas</h1>
      <SizeGuideForm initial={null} />
    </div>
  );
}
```

- [ ] **Step 2: Create the "[id]" page**

```tsx
// app/admin/guia-tallas/[id]/page.tsx
import { notFound } from "next/navigation";
import { protectRoute } from "@/lib/protect-route";
import { getSizeGuide } from "@/actions/size-guides";
import { SizeGuideForm } from "@/components/admin/size-guides/SizeGuideForm";

export const dynamic = "force-dynamic";

export default async function EditSizeGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await protectRoute("size-guides:update");
  const { id } = await params;

  const result = await getSizeGuide(id);
  if (!result.success) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Editar: {result.data.name}</h1>
      <SizeGuideForm initial={result.data} />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds (compiler warns about missing `SizeGuideForm` — fixed next task).

- [ ] **Step 4: Commit**

```bash
git add app/admin/guia-tallas/nueva app/admin/guia-tallas/\[id\]
git commit -m "feat(admin): size guide create + edit pages"
```

---

### Task 12: Create `SizeGuideForm` shell

**Files:**
- Create: `components/admin/size-guides/SizeGuideForm.tsx`

- [ ] **Step 1: Write the file (form shell + state + submit; sub-editors mounted from later tasks)**

```tsx
// components/admin/size-guides/SizeGuideForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createSizeGuide, updateSizeGuide } from "@/actions/size-guides";
import { SizeGuideTabsEditor } from "./SizeGuideTabsEditor";
import { SizeGuideTableEditor } from "./SizeGuideTableEditor";
import type {
  SizeGuideData,
  SizeGuideTab,
  SizeGuideTable,
  SizeUnit,
} from "@/lib/size-guides/types";

interface Props {
  initial: SizeGuideData | null;
}

export function SizeGuideForm({ initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState<SizeUnit>(initial?.unit ?? "cm");
  const [active, setActive] = useState(initial?.active ?? true);
  const [tabs, setTabs] = useState<SizeGuideTab[]>(initial?.tabs ?? []);
  const [table, setTable] = useState<SizeGuideTable>(
    initial?.table ?? { columns: [], rows: [] },
  );

  const onSubmit = () => {
    if (!name.trim()) {
      toast.error("Nombre requerido");
      return;
    }
    start(async () => {
      const payload = { name: name.trim(), unit, active, tabs, table };
      const r = initial
        ? await updateSizeGuide(initial.id, payload)
        : await createSizeGuide(payload);
      if (r.success) {
        toast.success(initial ? "Guía guardada" : "Guía creada");
        if (!initial && "data" in r) {
          router.push(`/admin/guia-tallas/${r.data.id}`);
        } else {
          router.refresh();
        }
      } else toast.error(r.error);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Configuración</h3>
          <div>
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Unidad principal</Label>
            <div className="flex gap-2 mt-1">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={unit === "cm"}
                  onChange={() => setUnit("cm")}
                />
                cm
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={unit === "in"}
                  onChange={() => setUnit("in")}
                />
                in
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label>Activa</Label>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Pestañas</h3>
          <SizeGuideTabsEditor value={tabs} onChange={setTabs} />
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Encuentra tu talla — Tabla</h3>
          <SizeGuideTableEditor value={table} unit={unit} onChange={setTable} />
        </Card>

        <Button onClick={onSubmit} disabled={pending} className="w-full">
          {pending
            ? "Guardando…"
            : initial
              ? "Guardar cambios"
              : "Crear guía"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: build succeeds (subeditors stubbed from next tasks).

- [ ] **Step 3: Commit**

```bash
git add components/admin/size-guides/SizeGuideForm.tsx
git commit -m "feat(admin): size guide form shell"
```

---

### Task 13: Create `SizeGuideTabsEditor`

**Files:**
- Create: `components/admin/size-guides/SizeGuideTabsEditor.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/admin/size-guides/SizeGuideTabsEditor.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import Image from "next/image";
import { SizeGuideMarkersEditor } from "./SizeGuideMarkersEditor";
import type { SizeGuideTab } from "@/lib/size-guides/types";

interface Props {
  value: SizeGuideTab[];
  onChange: (next: SizeGuideTab[]) => void;
}

export function SizeGuideTabsEditor({ value, onChange }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const addTab = () => {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        title: "Nueva pestaña",
        imageUrl: null,
        intro: null,
        markers: [],
      },
    ]);
    setOpenIdx(value.length);
  };

  const updateTab = (i: number, patch: Partial<SizeGuideTab>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const removeTab = (i: number) => {
    if (!confirm("¿Eliminar esta pestaña?")) return;
    onChange(value.filter((_, j) => j !== i));
    if (openIdx === i) setOpenIdx(null);
  };

  const handleUpload = async (i: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json.url) updateTab(i, { imageUrl: json.url });
    else toast.error(json.error ?? "Error al subir imagen");
  };

  return (
    <div className="space-y-3">
      {value.map((tab, i) => {
        const open = openIdx === i;
        return (
          <Card key={tab.id} className="p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                className="text-muted-foreground"
              >
                {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              <Input
                value={tab.title}
                onChange={(e) => updateTab(i, { title: e.target.value })}
                placeholder="Título de pestaña"
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeTab(i)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {open && (
              <div className="space-y-3 mt-3">
                <div>
                  <Label>Imagen</Label>
                  {tab.imageUrl ? (
                    <div className="relative size-40 rounded border bg-white">
                      <Image
                        src={tab.imageUrl}
                        alt={tab.title}
                        fill
                        className="object-contain"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 bg-white/80"
                        onClick={() => updateTab(i, { imageUrl: null })}
                      >
                        Quitar
                      </Button>
                    </div>
                  ) : (
                    <label className="block border-2 border-dashed rounded p-4 text-center cursor-pointer hover:bg-muted text-sm">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          e.target.files?.[0] && handleUpload(i, e.target.files[0])
                        }
                      />
                      Subir imagen
                    </label>
                  )}
                </div>

                <div>
                  <Label>Intro (opcional)</Label>
                  <Textarea
                    value={tab.intro ?? ""}
                    onChange={(e) =>
                      updateTab(i, { intro: e.target.value || null })
                    }
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Marcadores (A, B, C…)</Label>
                  <SizeGuideMarkersEditor
                    value={tab.markers}
                    onChange={(m) => updateTab(i, { markers: m })}
                  />
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addTab}>
        <Plus className="mr-1 size-4" /> Añadir pestaña
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds (warns on missing `SizeGuideMarkersEditor`).

- [ ] **Step 3: Commit**

```bash
git add components/admin/size-guides/SizeGuideTabsEditor.tsx
git commit -m "feat(admin): size guide tabs editor"
```

---

### Task 14: Create `SizeGuideMarkersEditor`

**Files:**
- Create: `components/admin/size-guides/SizeGuideMarkersEditor.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/admin/size-guides/SizeGuideMarkersEditor.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import type { SizeGuideMarker } from "@/lib/size-guides/types";

interface Props {
  value: SizeGuideMarker[];
  onChange: (next: SizeGuideMarker[]) => void;
}

export function SizeGuideMarkersEditor({ value, onChange }: Props) {
  const addMarker = () =>
    onChange([...value, { key: "", label: "", description: "" }]);

  const updateMarker = (i: number, patch: Partial<SizeGuideMarker>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const removeMarker = (i: number) =>
    onChange(value.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {value.map((m, i) => (
        <div key={i} className="border rounded p-2 space-y-2">
          <div className="flex gap-2">
            <Input
              value={m.key}
              onChange={(e) => updateMarker(i, { key: e.target.value })}
              placeholder="A"
              className="w-16 font-mono"
              maxLength={4}
            />
            <Input
              value={m.label}
              onChange={(e) => updateMarker(i, { label: e.target.value })}
              placeholder="Label (Largo, Ancho…)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeMarker(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <Textarea
            value={m.description}
            onChange={(e) =>
              updateMarker(i, { description: e.target.value })
            }
            placeholder="Cómo medir…"
            rows={2}
          />
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addMarker}>
        <Plus className="mr-1 size-4" /> Marcador
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/admin/size-guides/SizeGuideMarkersEditor.tsx
git commit -m "feat(admin): markers editor (A/B/C texts)"
```

---

### Task 15: Create `SizeGuideTableEditor`

**Files:**
- Create: `components/admin/size-guides/SizeGuideTableEditor.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/admin/size-guides/SizeGuideTableEditor.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import type {
  SizeGuideTable,
  SizeGuideRow,
  SizeUnit,
} from "@/lib/size-guides/types";

interface Props {
  value: SizeGuideTable;
  unit: SizeUnit;            // unidad principal de la guía
  onChange: (next: SizeGuideTable) => void;
}

export function SizeGuideTableEditor({ value, unit, onChange }: Props) {
  const [showOverrides, setShowOverrides] = useState(false);
  const otherUnit: SizeUnit = unit === "cm" ? "in" : "cm";

  const addColumn = () =>
    onChange({
      ...value,
      columns: [...value.columns, { key: "", label: "" }],
    });

  const updateColumn = (i: number, patch: Partial<{ key: string; label: string }>) => {
    const cols = value.columns.slice();
    cols[i] = { ...cols[i], ...patch };
    onChange({ ...value, columns: cols });
  };

  const removeColumn = (i: number) =>
    onChange({ ...value, columns: value.columns.filter((_, j) => j !== i) });

  const addRow = () => {
    const blank: Record<string, number> = {};
    for (const c of value.columns) blank[c.key] = 0;
    onChange({
      ...value,
      rows: [...value.rows, { size: "", values: blank }],
    });
  };

  const updateRow = (i: number, patch: Partial<SizeGuideRow>) => {
    const rows = value.rows.slice();
    rows[i] = { ...rows[i], ...patch };
    onChange({ ...value, rows });
  };

  const updateRowValue = (i: number, key: string, num: number) => {
    const rows = value.rows.slice();
    rows[i] = {
      ...rows[i],
      values: { ...rows[i].values, [key]: num },
    };
    onChange({ ...value, rows });
  };

  const updateRowOverride = (i: number, key: string, str: string) => {
    const rows = value.rows.slice();
    const overrides = { ...(rows[i].overrides ?? {}) };
    if (str.trim() === "") delete overrides[key];
    else overrides[key] = str;
    rows[i] = { ...rows[i], overrides };
    onChange({ ...value, rows });
  };

  const removeRow = (i: number) =>
    onChange({ ...value, rows: value.rows.filter((_, j) => j !== i) });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Columnas (Largo, Ancho…)</Label>
        {value.columns.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={c.key}
              onChange={(e) => updateColumn(i, { key: e.target.value })}
              placeholder="key (largo)"
              className="w-32 font-mono"
            />
            <Input
              value={c.label}
              onChange={(e) => updateColumn(i, { label: e.target.value })}
              placeholder="Label (Largo)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeColumn(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addColumn}>
          <Plus className="mr-1 size-4" /> Columna
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Filas — valores en {unit}</Label>
        {value.rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={row.size}
              onChange={(e) => updateRow(i, { size: e.target.value })}
              placeholder="S/M/L"
              className="w-20"
            />
            {value.columns.map((c) => (
              <Input
                key={c.key}
                type="number"
                value={row.values[c.key] ?? 0}
                onChange={(e) =>
                  updateRowValue(i, c.key, Number(e.target.value))
                }
                className="w-24"
              />
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 size-4" /> Fila
        </Button>
      </div>

      <div className="border-t pt-3">
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setShowOverrides((v) => !v)}
        >
          {showOverrides ? "Ocultar" : "Editar"} overrides en {otherUnit}
        </button>

        {showOverrides && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-muted-foreground">
              Si un override está vacío, la celda se calcula automáticamente
              ({unit} → {otherUnit}). Útil para mostrar valores tipo "16 ½".
            </p>
            {value.rows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="w-20 text-sm">{row.size || "—"}</span>
                {value.columns.map((c) => (
                  <Input
                    key={c.key}
                    type="text"
                    value={row.overrides?.[c.key] ?? ""}
                    onChange={(e) =>
                      updateRowOverride(i, c.key, e.target.value)
                    }
                    placeholder={`auto (${otherUnit})`}
                    className="w-24"
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Visit `/admin/guia-tallas/nueva`. Add 1 tab + 1 image + 1 marker. Add 2 columns + 3 rows. Click "Editar overrides". Type a value override. Hit "Crear guía".
Expected: toast "Guía creada", redirect to `/admin/guia-tallas/<id>`. Form re-loads with the same data.
Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add components/admin/size-guides/SizeGuideTableEditor.tsx
git commit -m "feat(admin): size guide table editor with overrides toggle"
```

---

## Phase 4 — Asignación a producto

### Task 16: Add `sizeGuideId` to `updateProductSchema` (and `createProductSchema`)

**Files:**
- Modify: `lib/validations.ts`

- [ ] **Step 1: Add the field to `updateProductSchema`**

Locate `updateProductSchema` in `lib/validations.ts` (around line 234). After `customizableTemplateId`, insert:

```diff
     customizableTemplateId: z.string().cuid().optional().nullable(),
     customizableMockupOverrides: z.any().optional().nullable(),
+    sizeGuideId: z.string().cuid().optional().nullable(),
   })
```

- [ ] **Step 2: Locate `createProductSchema` and add the same field**

In the same file, find `createProductSchema` (search for `export const createProductSchema`). Add `sizeGuideId: z.string().cuid().optional().nullable(),` to the object schema, in the same position (after `customizableTemplateId` if it exists; otherwise alongside other optional FKs).

- [ ] **Step 3: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/validations.ts
git commit -m "feat(validations): accept sizeGuideId in product schemas"
```

---

### Task 17: Wire `sizeGuideId` through the update API route

**Files:**
- Modify: `app/api/admin/products/[productId]/update/route.ts`

- [ ] **Step 1: Add `sizeGuideId` to `productUpdate`**

Locate the `productUpdate` object (around line 70-92). After the `customizableMockupOverrides` line, add:

```diff
       customizableMockupOverrides:
         validatedData.customizableMockupOverrides == null
           ? Prisma.JsonNull
           : (validatedData.customizableMockupOverrides as Prisma.InputJsonValue),
+      sizeGuideId: validatedData.sizeGuideId ?? null,
     };
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/products/[productId]/update/route.ts
git commit -m "feat(api): persist sizeGuideId on product update"
```

---

### Task 18: Wire `sizeGuideId` through the create API route

**Files:**
- Modify: `app/api/admin/products/create/route.ts`

- [ ] **Step 1: Add `sizeGuideId` to the `data` object passed to `prisma.product.create`**

Read `app/api/admin/products/create/route.ts`. Find the `prisma.product.create({ data: ... })` call. Add `sizeGuideId: validatedData.sizeGuideId ?? null,` to the `data` object — alongside the existing `customizableTemplateId` field if it's there.

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/products/create/route.ts
git commit -m "feat(api): persist sizeGuideId on product create"
```

---

### Task 19: Create `SizeGuideCard` component

**Files:**
- Create: `components/admin/products/SizeGuideCard.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/admin/products/SizeGuideCard.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { listActiveSizeGuides } from "@/actions/size-guides";

interface Option {
  id: string;
  name: string;
  unit: "cm" | "in";
}

interface Props {
  value: string | null;
  onChange: (next: string | null) => void;
}

export function SizeGuideCard({ value, onChange }: Props) {
  const [opts, setOpts] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listActiveSizeGuides().then((r) => {
      if (r.success) setOpts(r.data);
      setLoading(false);
    });
  }, []);

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Guía de tallas</h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div>
          <Label>Asignar guía</Label>
          <select
            className="w-full border rounded px-2 py-1.5 text-sm"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">Sin guía</option>
            {opts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.unit})
              </option>
            ))}
          </select>
        </div>
      )}
      <Link
        href="/admin/guia-tallas/nueva"
        target="_blank"
        className="text-xs text-blue-600 hover:underline"
      >
        + Crear nueva guía
      </Link>
    </Card>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/admin/products/SizeGuideCard.tsx
git commit -m "feat(admin): SizeGuideCard for product form"
```

---

### Task 20: Mount `SizeGuideCard` in `EditProductForm`

**Files:**
- Modify: `components/admin/EditProductForm.tsx`

- [ ] **Step 1: Add import**

Near the existing import of `CustomizationCard` (line 17), add:

```ts
import { SizeGuideCard } from "@/components/admin/products/SizeGuideCard";
```

- [ ] **Step 2: Add local state for `sizeGuideId`**

Near the `customizableTemplateId` state (around line 109-110), add:

```ts
const [sizeGuideId, setSizeGuideId] = useState<string | null>(
  product.sizeGuideId ?? null
);
```

- [ ] **Step 3: Include `sizeGuideId` in the submit payload**

Near where `customizableTemplateId` is included in the submit payload (around line 353), add `sizeGuideId,` next to it.

- [ ] **Step 4: Render the card next to `<CustomizationCard>`**

Near the existing `<CustomizationCard>` render (around line 782-784), add directly after it:

```tsx
<SizeGuideCard value={sizeGuideId} onChange={setSizeGuideId} />
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`. Visit `/admin/productos/<existingId>`. Confirm the new "Guía de tallas" card appears, lists the guide created in Task 15, and saving propagates `sizeGuideId` (check by reloading the page — the select should retain its value).
Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add components/admin/EditProductForm.tsx
git commit -m "feat(admin): mount SizeGuideCard in product edit form"
```

---

### Task 21: Mount `SizeGuideCard` in `NewProductForm`

**Files:**
- Modify: `components/admin/NewProductForm.tsx`

- [ ] **Step 1: Apply the equivalent changes from Task 20 to `NewProductForm`**

Mirror the import, the `useState<string | null>(null)`, the inclusion in the create payload, and the render placement. Initial value is `null` (no existing product to read from).

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Visit `/admin/productos/nuevo`. Confirm the card appears. Create a new product with a size guide selected; reload its detail page and verify the assignment persisted.
Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add components/admin/NewProductForm.tsx
git commit -m "feat(admin): mount SizeGuideCard in product create form"
```

---

## Phase 5 — Storefront UI

### Task 22: Create `format-cell.ts` helper

**Files:**
- Create: `components/shop/size-guide/format-cell.ts`

- [ ] **Step 1: Write the file**

```ts
// components/shop/size-guide/format-cell.ts
import type {
  SizeGuideRow,
  SizeGuideColumn,
  SizeUnit,
} from "@/lib/size-guides/types";

export function renderCell(
  row: SizeGuideRow,
  col: SizeGuideColumn,
  displayUnit: SizeUnit,
  primaryUnit: SizeUnit,
): string {
  const primary = row.values[col.key];
  if (primary === undefined || primary === null) return "";
  if (displayUnit === primaryUnit) return String(primary);

  const override = row.overrides?.[col.key];
  if (override) return override;

  const factor = displayUnit === "in" ? 1 / 2.54 : 2.54;
  const converted = primary * factor;
  return converted.toFixed(1).replace(/\.0$/, "");
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/shop/size-guide/format-cell.ts
git commit -m "feat(shop): cell formatting helper for size guide table"
```

---

### Task 23: Create `SizeGuideTable` component

**Files:**
- Create: `components/shop/size-guide/SizeGuideTable.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/shop/size-guide/SizeGuideTable.tsx
"use client";

import { useState } from "react";
import { renderCell } from "./format-cell";
import type {
  SizeGuideTable as TableData,
  SizeUnit,
} from "@/lib/size-guides/types";

interface Props {
  table: TableData;
  primaryUnit: SizeUnit;
}

export function SizeGuideTable({ table, primaryUnit }: Props) {
  const [displayUnit, setDisplayUnit] = useState<SizeUnit>(primaryUnit);

  if (table.columns.length === 0 || table.rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setDisplayUnit("in")}
          className={
            displayUnit === "in"
              ? "font-semibold border-b-2 border-foreground pb-0.5"
              : "text-muted-foreground"
          }
        >
          Pulgadas
        </button>
        <button
          type="button"
          onClick={() => setDisplayUnit("cm")}
          className={
            displayUnit === "cm"
              ? "font-semibold border-b-2 border-foreground pb-0.5"
              : "text-muted-foreground"
          }
        >
          Centímetros
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4 uppercase text-xs">Etiqueta de talla</th>
              {table.columns.map((c) => (
                <th key={c.key} className="py-2 pr-4 uppercase text-xs">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{row.size}</td>
                {table.columns.map((col) => (
                  <td key={col.key} className="py-2 pr-4">
                    {renderCell(row, col, displayUnit, primaryUnit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/shop/size-guide/SizeGuideTable.tsx
git commit -m "feat(shop): size guide table with unit toggle"
```

---

### Task 24: Create `SizeGuideTabContent` component

**Files:**
- Create: `components/shop/size-guide/SizeGuideTabContent.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/shop/size-guide/SizeGuideTabContent.tsx
import Image from "next/image";
import type { SizeGuideTab } from "@/lib/size-guides/types";

interface Props {
  tab: SizeGuideTab;
}

export function SizeGuideTabContent({ tab }: Props) {
  return (
    <div className="space-y-4">
      {tab.intro && (
        <p
          className="text-sm text-muted-foreground"
          style={{ whiteSpace: "pre-line" }}
        >
          {tab.intro}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[280px_1fr] items-start">
        {tab.imageUrl && (
          <div className="relative aspect-square bg-slate-100 rounded">
            <Image
              src={tab.imageUrl}
              alt={tab.title}
              fill
              className="object-contain p-2"
            />
          </div>
        )}

        {tab.markers.length > 0 && (
          <div className="space-y-3">
            {tab.markers.map((m, i) => (
              <div key={i}>
                <h4 className="font-semibold text-sm">
                  {m.key} {m.label}
                </h4>
                <p
                  className="text-sm text-muted-foreground"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/shop/size-guide/SizeGuideTabContent.tsx
git commit -m "feat(shop): size guide tab content (image + markers)"
```

---

### Task 25: Create `SizeGuideModal` component

**Files:**
- Create: `components/shop/size-guide/SizeGuideModal.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/shop/size-guide/SizeGuideModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SizeGuideTabContent } from "./SizeGuideTabContent";
import { SizeGuideTable } from "./SizeGuideTable";
import type { SizeGuideData } from "@/lib/size-guides/types";

interface Props {
  guide: SizeGuideData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SizeGuideModal({ guide, open, onOpenChange }: Props) {
  const [activeTabId, setActiveTabId] = useState<string | null>(
    guide.tabs[0]?.id ?? null,
  );
  const activeTab = guide.tabs.find((t) => t.id === activeTabId) ?? guide.tabs[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl w-[95vw] sm:w-[640px] max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-bold border-b pb-3">Guía de tallas</h2>

        {guide.tabs.length > 1 && (
          <div className="flex gap-4 border-b -mx-6 px-6 text-sm">
            {guide.tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTabId(t.id)}
                className={
                  activeTab?.id === t.id
                    ? "py-2 border-b-2 border-foreground font-semibold"
                    : "py-2 text-muted-foreground"
                }
              >
                {t.title}
              </button>
            ))}
          </div>
        )}

        {activeTab && (
          <div className="py-4">
            <h3 className="font-semibold mb-3">{activeTab.title}</h3>
            <SizeGuideTabContent tab={activeTab} />
          </div>
        )}

        {guide.table.rows.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Encuentra tu talla</h3>
            <SizeGuideTable table={guide.table} primaryUnit={guide.unit} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/shop/size-guide/SizeGuideModal.tsx
git commit -m "feat(shop): size guide modal (tabs + table)"
```

---

### Task 26: Create `SizeGuideButton` component

**Files:**
- Create: `components/shop/size-guide/SizeGuideButton.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/shop/size-guide/SizeGuideButton.tsx
"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import { SizeGuideModal } from "./SizeGuideModal";
import type { SizeGuideData } from "@/lib/size-guides/types";

interface Props {
  guide: SizeGuideData;
}

export function SizeGuideButton({ guide }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
      >
        <Ruler className="size-3.5" />
        Guía de tallas
      </button>
      <SizeGuideModal guide={guide} open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/shop/size-guide/SizeGuideButton.tsx
git commit -m "feat(shop): SizeGuideButton (toggles the modal)"
```

---

### Task 27: Include `sizeGuide` in product page query

**Files:**
- Modify: `app/(shop)/productos/[slug]/page.tsx`

- [ ] **Step 1: Locate the `findUnique`/`findFirst` for the product and extend its `include`**

Read the file. Find the Prisma query that loads the product (`prisma.product.findFirst({ where: { slug }, include: { … } })` or similar). Add to the `include` block:

```diff
   include: {
     // …existentes…
+    sizeGuide: { where: { active: true } },
   },
```

- [ ] **Step 2: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/(shop)/productos/[slug]/page.tsx
git commit -m "feat(shop): include sizeGuide in product detail query"
```

---

### Task 28: Render `SizeGuideButton` next to the size selector

**Files:**
- Modify: `components/shop/ProductOptions.tsx`

- [ ] **Step 1: Inspect current props and accept the size guide**

Read `components/shop/ProductOptions.tsx`. Identify the `Props` interface. Add a prop:

```ts
sizeGuide?: import("@/lib/size-guides/types").SizeGuideData | null;
```

- [ ] **Step 2: Render the button next to the size option label**

Find where each option's label/heading is rendered (look for `option.name` near a `<label>` / `<h3>` element). For the option whose `name.toLowerCase()` includes `"talla"` or `"size"`, render the button next to the label:

```tsx
{(option.name.toLowerCase().includes("talla") ||
  option.name.toLowerCase().includes("size")) &&
  sizeGuide && <SizeGuideButton guide={sizeGuide} />}
```

Also add the import at the top:
```ts
import { SizeGuideButton } from "@/components/shop/size-guide/SizeGuideButton";
```

- [ ] **Step 3: Pass `sizeGuide` from the product page**

Reopen `app/(shop)/productos/[slug]/page.tsx`. Find the `<ProductOptions … />` render. Add the prop:

```diff
- <ProductOptions options={product.options} variants={product.variants} … />
+ <ProductOptions options={product.options} variants={product.variants} sizeGuide={product.sizeGuide as any} … />
```

If `product.sizeGuide` is already typed correctly (because of the `include`), the cast can be omitted. The component is server-rendering data into a client component, so the JSON is serializable.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`. Find a product with a "Talla" option, assign it a size guide from admin, reload the public page. Click "Guía de tallas" — the modal opens with the right data.
Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add components/shop/ProductOptions.tsx app/(shop)/productos/[slug]/page.tsx
git commit -m "feat(shop): show size guide button next to talla/size selector"
```

---

## Phase 6 — Customizer integration

### Task 29: Replace `SizeGuideDrawer` with `SizeGuideModal` in `ProductTab`

**Files:**
- Modify: `components/customizer/LeftSidebar/ProductTab.tsx`

- [ ] **Step 1: Update the imports**

```diff
- import { SizeGuideDrawer } from "./SizeGuideDrawer";
+ import { SizeGuideModal } from "@/components/shop/size-guide/SizeGuideModal";
```

- [ ] **Step 2: Change the visibility condition (line 105)**

```diff
-              {isSizeOption && template?.sizeGuide && (
+              {isSizeOption && product.sizeGuide && (
                 <button
                   onClick={() => setSizeGuideOpen(true)}
                   className="text-xs text-blue-600 hover:underline"
                 >
                   Guía de tallas
                 </button>
               )}
```

- [ ] **Step 3: Replace the modal render (lines 210-215)**

```diff
-      {sizeGuideOpen && template?.sizeGuide && (
-        <SizeGuideDrawer
-          guide={template.sizeGuide}
-          onClose={() => setSizeGuideOpen(false)}
-        />
-      )}
+      {product.sizeGuide && (
+        <SizeGuideModal
+          guide={product.sizeGuide}
+          open={sizeGuideOpen}
+          onOpenChange={setSizeGuideOpen}
+        />
+      )}
```

- [ ] **Step 4: Verify TypeScript builds (will fail — `BuilderProduct.sizeGuide` not yet typed)**

Run: `npm run build`
Expected: error about missing `sizeGuide` on `BuilderProduct`. Fixed in next task.

- [ ] **Step 5: Commit (despite build error — next task fixes it)**

```bash
git add components/customizer/LeftSidebar/ProductTab.tsx
git commit -m "refactor(customizer): use shared SizeGuideModal instead of drawer"
```

---

### Task 30: Add `sizeGuide` to `BuilderProduct`

**Files:**
- Modify: `components/customizer/CustomizerLayout.tsx`

- [ ] **Step 1: Add the import**

Near the existing imports of customizer types:

```ts
import type { SizeGuideData } from "@/lib/size-guides/types";
```

- [ ] **Step 2: Add the field to `BuilderProduct`**

```diff
 export interface BuilderProduct {
   // …existentes…
+  sizeGuide: SizeGuideData | null;
 }
```

- [ ] **Step 3: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds (the customizer page from Task 31 will pass real data; for now it must come from `null` default).

- [ ] **Step 4: Commit**

```bash
git add components/customizer/CustomizerLayout.tsx
git commit -m "feat(customizer): BuilderProduct.sizeGuide"
```

---

### Task 31: Load `sizeGuide` in the customizer page

**Files:**
- Modify: `app/(customizer)/productos/[slug]/personalizar/page.tsx`

- [ ] **Step 1: Extend the Prisma query that loads the product**

Open the file and find the `prisma.product.findUnique` (or `findFirst`) call. Add to the `include`:

```diff
   include: {
     // …existentes…
+    sizeGuide: { where: { active: true } },
   },
```

- [ ] **Step 2: Pass `product.sizeGuide` to the builder**

Find where the loaded product is mapped/passed into the customizer (search for `BuilderProduct` or where the prop with all the customizer info is built). Include `sizeGuide: product.sizeGuide ? mapToSizeGuideData(product.sizeGuide) : null`. If a mapper isn't needed (Prisma returns the JSON columns already typed with `Prisma.JsonValue`), define a tiny adapter inline:

```ts
const sizeGuide = product.sizeGuide
  ? {
      id: product.sizeGuide.id,
      name: product.sizeGuide.name,
      unit: product.sizeGuide.unit === "IN" ? "in" : "cm",
      tabs: (product.sizeGuide.tabs as unknown as SizeGuideTab[]) ?? [],
      table:
        (product.sizeGuide.table as unknown as SizeGuideTable) ??
        { columns: [], rows: [] },
      active: product.sizeGuide.active,
    }
  : null;
```

Add the imports needed for `SizeGuideTab` / `SizeGuideTable` from `@/lib/size-guides/types`.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. Open a customizable product with a size option whose product has been assigned a size guide. The "Guía de tallas" link appears in the sidebar; clicking opens the same modal as the public product page.
Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add app/(customizer)/productos/[slug]/personalizar/page.tsx
git commit -m "feat(customizer): load product.sizeGuide for builder"
```

---

### Task 32: Drop `sizeGuide` from customizer template plumbing

**Files:**
- Modify: `lib/customizer/types.ts`
- Modify: `components/customizer/store.ts`
- Modify: `actions/customizer.ts`
- Modify: `components/admin/customizer-templates/TemplateForm.tsx`

- [ ] **Step 1: Remove `sizeGuide` from `CustomizableTemplateData`**

In `lib/customizer/types.ts`, delete the line:
```diff
-  sizeGuide: SizeGuide | null;
```

Also delete the now-unused `SizeGuide` and `SizeGuideRow` interfaces from the same file (lines 20-30 of the original).

- [ ] **Step 2: Remove the `sizeGuide` card from `TemplateForm`**

In `components/admin/customizer-templates/TemplateForm.tsx`:
- Remove the import of `SizeGuideEditor` (line 17).
- Remove the `sizeGuide` line from the initial state object (around line 53).
- Remove the entire `<Card>` block titled "Tabla de medidas" (around lines 176-182). Replace it with a small banner:

```tsx
<Card className="p-4 text-sm text-muted-foreground">
  La guía de tallas ahora se asigna desde el producto.{" "}
  <Link
    href="/admin/guia-tallas"
    className="text-blue-600 hover:underline"
  >
    Ir a guías de tallas →
  </Link>
</Card>
```

Add `import Link from "next/link";` at the top if it's not already imported.

- [ ] **Step 3: Remove `sizeGuide` from the customizer Zod schema in `actions/customizer.ts`**

Open `actions/customizer.ts`. Find the Zod schema that validates `CustomizableTemplate` payloads. Remove the `sizeGuide: …` field. Find the `prisma.customizableTemplate.create` and `update` calls; remove `sizeGuide: …` from their `data` objects (do NOT add a `DROP COLUMN` here — that's phase 8).

- [ ] **Step 4: Adjust the store**

The store imports `CustomizableTemplateData`, which no longer has `sizeGuide`. The store itself should still compile since it doesn't reference `sizeGuide` directly. Verify by running build.

- [ ] **Step 5: Verify TypeScript builds**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/customizer/types.ts components/customizer/store.ts actions/customizer.ts components/admin/customizer-templates/TemplateForm.tsx
git commit -m "refactor(customizer): drop sizeGuide from template type/schema/UI"
```

---

### Task 33: Update customizer tests

**Files:**
- Modify: `actions/__tests__/customizer.test.ts`
- Modify: `components/customizer/__tests__/store.test.ts`

- [ ] **Step 1: Remove `sizeGuide` from any test fixture for `CustomizableTemplateData`**

Grep both files for `sizeGuide`. Remove every occurrence — the field should disappear from fixtures and assertions. Keep the rest of each test intact.

```bash
# (informational only — use Read/Edit, not bash)
```

- [ ] **Step 2: Run the test suite**

Run the project's existing test command. If there is no defined npm test script, the test runner used appears to be Vitest (look for `vitest` in `package.json` `devDependencies`). Run `npx vitest run` and confirm both tests pass.

If there is no test runner configured at all, simply ensure the `.test.ts` files type-check via `npm run build`.

- [ ] **Step 3: Commit**

```bash
git add actions/__tests__/customizer.test.ts components/customizer/__tests__/store.test.ts
git commit -m "test(customizer): drop sizeGuide from fixtures"
```

---

## Phase 7 — Migración de datos

### Task 34: Write migration script for legacy size guides

**Files:**
- Create: `scripts/migrate-customizable-size-guides.ts`

- [ ] **Step 1: Write the file**

```ts
// scripts/migrate-customizable-size-guides.ts
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface LegacyColumn {
  key: string;
  label: string;
}
interface LegacyRow {
  size: string;
  values: Record<string, number>;
}
interface LegacySizeGuide {
  unit: "cm" | "in";
  columns: LegacyColumn[];
  rows: LegacyRow[];
  notes?: string;
}

async function main() {
  // Some installations no longer have the legacy column. Tolerate that.
  let templates: Array<{
    id: string;
    name: string;
    sizeGuide: Prisma.JsonValue | null;
    products: { id: string }[];
  }>;
  try {
    templates = await prisma.$queryRaw<typeof templates>`
      SELECT t.id, t.name, t."sizeGuide",
        COALESCE(json_agg(json_build_object('id', p.id))
          FILTER (WHERE p.id IS NOT NULL), '[]')::jsonb AS products
      FROM "CustomizableTemplate" t
      LEFT JOIN "Product" p ON p."customizableTemplateId" = t.id
      WHERE t."sizeGuide" IS NOT NULL
      GROUP BY t.id;
    `;
  } catch (err) {
    console.warn(
      "⚠ CustomizableTemplate.sizeGuide column not found — migration already ran (or column was dropped). Nothing to do.",
    );
    return;
  }

  if (templates.length === 0) {
    console.log("✓ No legacy size guides found — nothing to migrate.");
    return;
  }

  let createdCount = 0;
  let assignedCount = 0;

  for (const tpl of templates) {
    const legacy = tpl.sizeGuide as unknown as LegacySizeGuide;
    if (!legacy || !Array.isArray(legacy.rows)) continue;

    const tabs =
      legacy.notes && legacy.notes.trim()
        ? [
            {
              id: crypto.randomUUID(),
              title: "Notas",
              imageUrl: null,
              intro: legacy.notes,
              markers: [],
            },
          ]
        : [];

    const created = await prisma.sizeGuide.create({
      data: {
        name: `Guía de ${tpl.name}`,
        unit: legacy.unit === "in" ? "IN" : "CM",
        tabs: tabs as unknown as Prisma.InputJsonValue,
        table: {
          columns: legacy.columns ?? [],
          rows: (legacy.rows ?? []).map((r) => ({
            size: r.size,
            values: r.values,
          })),
        } as unknown as Prisma.InputJsonValue,
        active: true,
      },
    });
    createdCount++;

    if (tpl.products.length > 0) {
      const updated = await prisma.product.updateMany({
        where: {
          id: { in: tpl.products.map((p) => p.id) },
          sizeGuideId: null,
        },
        data: { sizeGuideId: created.id },
      });
      assignedCount += updated.count;
      console.log(
        `✓ ${tpl.name} → ${created.id} (${updated.count}/${tpl.products.length} products linked)`,
      );
    } else {
      console.log(`✓ ${tpl.name} → ${created.id} (no products linked)`);
    }
  }

  console.log(
    `\nDone. Created ${createdCount} size guide(s), assigned ${assignedCount} product link(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run locally**

Run: `npx tsx scripts/migrate-customizable-size-guides.ts`
Expected (if any legacy guide exists): `✓ <Template name> → <new id> (N/M products linked)` lines + summary. If nothing exists, `✓ No legacy size guides found`.

Open Prisma Studio and verify:
- A `SizeGuide` row exists for each legacy template with `sizeGuide ≠ null`.
- The `Product.sizeGuideId` field is populated for the matching products.
- `CustomizableTemplate.sizeGuide` is **untouched**.

- [ ] **Step 3: Smoke-test the public product page**

Run: `npm run dev`. Open a previously customizable product on the public storefront. The "Guía de tallas" link must appear next to the talla selector and open the modal with the migrated table.
Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-customizable-size-guides.ts
git commit -m "chore(migration): script to copy legacy CustomizableTemplate.sizeGuide into SizeGuide rows"
```

---

## Phase 8 — Final cleanup (separate PR, post-deploy)

> Run **only after** the previous phases have been deployed to production, the migration script has been executed in production, and you have manually verified that 1–2 customizable products show their migrated guide on both the public page and the customizer.

### Task 35: Drop the legacy column

**Files:**
- Create: `prisma/migrations/<timestamp>_drop_customizable_template_size_guide/migration.sql`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Remove `sizeGuide` from `CustomizableTemplate` in `schema.prisma`**

Open `prisma/schema.prisma`, find the `CustomizableTemplate` model, and delete the line:
```diff
-  sizeGuide         Json?
```

- [ ] **Step 2: Generate the migration**

Run: `npx prisma migrate dev --name drop_customizable_template_size_guide --create-only`
Expected: a new migration folder containing exactly one statement: `ALTER TABLE "CustomizableTemplate" DROP COLUMN "sizeGuide";`. Open the file and confirm there is nothing else (no surprise DROPs).

- [ ] **Step 3: Apply migration locally**

Run: `npx prisma migrate dev`
Expected: `Database schema is up to date.`

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): drop legacy CustomizableTemplate.sizeGuide column"
```

---

### Task 36: Delete legacy files

**Files:**
- Delete: `components/admin/customizer-templates/SizeGuideEditor.tsx`
- Delete: `components/customizer/LeftSidebar/SizeGuideDrawer.tsx`

- [ ] **Step 1: Delete the files**

```bash
git rm components/admin/customizer-templates/SizeGuideEditor.tsx
git rm components/customizer/LeftSidebar/SizeGuideDrawer.tsx
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (no dangling references — all imports were already removed in Task 29 and Task 32).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(cleanup): remove legacy SizeGuideEditor + SizeGuideDrawer"
```

---

## Smoke test (run before merging Phase 1–7 PR)

1. Create a guide at `/admin/guia-tallas/nueva` with:
   - Name: "Camisetas Unisex"
   - 2 tabs: "Medidas de producto" + "Mídete"
   - Image + intro + 2 markers (A Largo, B Ancho) on each tab
   - Table: 4 rows (XS/S/M/L) × 2 columns (Largo/Ancho), one cell with override `"16 ½"`
2. Save → list shows the new guide with productCount=0.
3. Edit a product at `/admin/productos/<id>` → assign "Camisetas Unisex" → save → reload form, the select retains the value.
4. Open the public product page → button "Guía de tallas" appears next to the Talla selector → opens the modal → tabs work → toggle Pulgadas/Centímetros shows `16 ½` for the override cell.
5. Open the same product in the customizer (`/productos/<slug>/personalizar`) → the same modal opens from the customizer's "Guía de tallas" link.
6. Delete the guide from `/admin/guia-tallas` → confirm dialog says "1 producto perderá su guía. ¿Continuar?" → confirm → product page no longer shows the button (no error).
7. Run `npx tsx scripts/migrate-customizable-size-guides.ts` against a DB that has at least one legacy `CustomizableTemplate.sizeGuide` → verify the new `SizeGuide` row was created and the linked products have `sizeGuideId` populated.

---

## Self-review checklist (already completed)

- ✓ Spec coverage: every section of `2026-05-02-size-guides-design.md` is mapped to one or more tasks.
- ✓ No placeholders ("TBD", "implement later", etc.).
- ✓ Type consistency: `SizeGuideData`, `SizeGuideTab`, `SizeGuideTable`, `SizeGuideRow`, `SizeGuideColumn`, `SizeGuideMarker`, `SizeUnit`, `renderCell` are used consistently across all tasks.
- ✓ Action signatures match between `actions/size-guides.ts` and the components consuming them.
- ✓ Migration order is expand → data move → contract (phase 1, phase 7, phase 8).
- ✓ Customizer no longer reads from `template.sizeGuide` after Task 32.
