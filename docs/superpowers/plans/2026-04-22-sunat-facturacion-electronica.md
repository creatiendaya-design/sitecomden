# Facturación Electrónica SUNAT — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar emisión de boletas y facturas electrónicas SUNAT via Nubefact, con selector en checkout, panel admin de configuración, descarga en portal del cliente y envío por email.

**Architecture:** Adaptador `NubefactProvider` detrás de la interfaz `SunatProvider` (extensible a futuros OSEs). Configuración por tienda almacenada en tabla `Setting`. Emisión automática/manual/mixta configurable. API Key cifrada con AES-256-GCM.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL, Nubefact API REST, Node.js `crypto` (AES-256-GCM), Resend (email), Zod (validación), shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-22-sunat-facturacion-electronica-design.md`

> **Orden de dependencias crítica:** Ejecutar Task 9 (email template) **antes** de Task 8 (server actions), ya que `actions/sunat.ts` importa `sendComprobanteEmail` de `lib/email.ts`. El plan está numerado por lógica de dominio; para ejecución correcta seguir: 1→2→3→4→5→6→7→**9**→**8**→10→11→12→13→14→15→16→17.

---

## Archivos del Plan

| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | Modificar: campos en `Product`, `Order`; nuevo modelo `ElectronicDocument` |
| `lib/sunat-types.ts` | Crear: interfaz `SunatProvider`, enums, tipos compartidos |
| `lib/sunat-crypto.ts` | Crear: cifrado/descifrado AES-256-GCM para API Key |
| `lib/sunat-igv.ts` | Crear: cálculo de IGV por ítem |
| `lib/sunat-nubefact.ts` | Crear: `NubefactProvider implements SunatProvider` |
| `lib/sunat.ts` | Crear: factory que retorna el provider activo según config |
| `lib/validations.ts` | Modificar: agregar schemas Zod para RUC y datos de factura |
| `actions/sunat.ts` | Crear: emit, cancel, resend, getStatus, saveConfig, testConnection |
| `actions/orders.ts` | Modificar: agregar campos de comprobante al schema y `createOrder` |
| `app/(checkout)/checkout/CheckoutPageClient.tsx` | Modificar: agregar sección de comprobante |
| `app/admin/configuracion/sunat/page.tsx` | Crear: panel de configuración SUNAT |
| `app/admin/configuracion/page.tsx` | Modificar: agregar tarjeta de navegación a SUNAT |
| `app/admin/facturacion/page.tsx` | Crear: lista de comprobantes emitidos |
| `app/admin/ordenes/[orderId]/page.tsx` | Modificar: agregar bloque de comprobante |
| `app/(shop)/cuenta/ordenes/[id]/page.tsx` | Modificar: agregar bloque de descarga |
| `emails/comprobante-emitido.tsx` | Crear: template email Resend |
| `.env` | Modificar: agregar `SUNAT_ENCRYPTION_KEY` |

---

## Task 1: Schema Prisma — nuevos campos y modelo

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar enum `IgvType` y campo en `Product`**

En `prisma/schema.prisma`, después del enum `CheckoutMode`, agregar:

```prisma
enum IgvType {
  GRAVADO
  EXONERADO
  INAFECTO
}
```

En el modelo `Product`, agregar el campo después de `weight`:
```prisma
igvType          IgvType           @default(GRAVADO)
```

- [ ] **Step 2: Agregar enum `DocumentType` y campos en `Order`**

Agregar el enum:
```prisma
enum DocumentType {
  BOLETA
  FACTURA
}
```

En el modelo `Order`, agregar después de `customerNotes`:
```prisma
documentType         DocumentType?
buyerRuc             String?
buyerRazonSocial     String?
buyerFiscalAddress   String?
electronicDocument   ElectronicDocument?
```

- [ ] **Step 3: Agregar modelo `ElectronicDocument` y enum `DocStatus`**

Después del modelo `PendingPayment`, agregar:

```prisma
enum DocStatus {
  PENDING
  ISSUED
  CANCELLED
  ERROR
}

model ElectronicDocument {
  id                 String       @id @default(cuid())
  orderId            String       @unique
  order              Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)

  type               DocumentType
  series             String
  number             Int
  fullNumber         String

  status             DocStatus    @default(PENDING)

  xmlContent         String?      @db.Text
  pdfUrl             String?
  xmlUrl             String?
  cdrUrl             String?
  sunatCode          Int?
  hash               String?
  nubefactId         String?
  errorMessage       String?

  issuedAt           DateTime?
  cancelledAt        DateTime?
  cancellationReason String?

  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@index([orderId])
  @@index([status])
  @@index([type])
  @@index([fullNumber])
}
```

- [ ] **Step 4: Crear y aplicar migración**

```bash
npx prisma migrate dev --name add_sunat_electronic_documents
```

Verificar que la migración corra sin errores. Si hay conflicto con `electronicDocument` en `Order`, revisar que la relación esté bien definida en ambos lados.

- [ ] **Step 5: Regenerar Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat: add SUNAT electronic document schema (IgvType, DocumentType, ElectronicDocument)"
```

---

## Task 2: Variable de entorno para cifrado

**Files:**
- Modify: `.env`
- Modify: `.env.example` (si existe)

- [ ] **Step 1: Agregar `SUNAT_ENCRYPTION_KEY` al `.env`**

Generar una clave de 32 bytes en hex:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Agregar al `.env`:
```
SUNAT_ENCRYPTION_KEY=<clave generada de 64 chars hex>
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add SUNAT_ENCRYPTION_KEY env var"
```

> **Nota:** Nunca commitear `.env` con valores reales. Solo commitear `.env.example` con el nombre de la variable vacía.

---

## Task 3: Tipos y interfaces (`lib/sunat-types.ts`)

**Files:**
- Create: `lib/sunat-types.ts`

- [ ] **Step 1: Crear el archivo de tipos**

```typescript
import type { Order, ElectronicDocument, DocumentType } from "@prisma/client";

export type { DocumentType };

export type DocStatus = "PENDING" | "ISSUED" | "CANCELLED" | "ERROR";

export interface NubefactItem {
  unidad_de_medida: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  subtotal: number;
  tipo_de_igv: 1 | 2 | 3;
  igv: number;
  total: number;
}

export interface NubefactPayload {
  operacion: "generar_comprobante";
  tipo_de_comprobante: 1 | 2;
  serie: string;
  numero: number;
  sunat_transaction: 1;
  cliente_tipo_de_documento: 0 | 1 | 6;
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion: string;
  cliente_email: string;
  fecha_de_emision: string;
  moneda: 1;
  porcentaje_de_igv: 18.0;
  total_gravada: number;
  total_inafecta: number;
  total_exonerada: number;
  total_igv: number;
  total: number;
  enviar_automaticamente_a_la_sunat: true;
  enviar_automaticamente_al_cliente: false;
  items: NubefactItem[];
}

export interface NubefactResponse {
  enlace_del_pdf: string;
  enlace_del_xml: string;
  enlace_del_cdr: string;
  serie: string;
  numero: number;
  aceptada_por_sunat: boolean;
  sunat_description: string;
  codigo_hash: string;
  codigo: number;
  errors: string[];
  sunat_responsecode: string;
}

export interface SunatConfig {
  enabled: boolean;
  emissionMode: "auto" | "manual" | "mixed";
  apiKey: string;
  apiUrl: string;
  ruc: string;
  razonSocial: string;
  address: string;
  boletaSeries: string;
  facturaSeries: string;
  pricesIncludeIgv: boolean;
}

export interface SunatProvider {
  emitDocument(
    order: Order & { items: Array<{ name: string; quantity: number; price: number; sku: string | null; productId: string | null }> },
    type: DocumentType,
    config: SunatConfig
  ): Promise<ElectronicDocument>;
  cancelDocument(documentId: string, reason: string, config: SunatConfig): Promise<void>;
  resendEmail(documentId: string, email: string, config: SunatConfig): Promise<void>;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sunat-types.ts
git commit -m "feat: add SUNAT provider interface and Nubefact types"
```

---

## Task 4: Cifrado AES-256-GCM (`lib/sunat-crypto.ts`)

**Files:**
- Create: `lib/sunat-crypto.ts`

- [ ] **Step 1: Crear utilidad de cifrado**

```typescript
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.SUNAT_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("SUNAT_ENCRYPTION_KEY must be a 64-char hex string");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sunat-crypto.ts
git commit -m "feat: add AES-256-GCM encryption utility for SUNAT API key"
```

---

## Task 5: Cálculo de IGV por ítem (`lib/sunat-igv.ts`)

**Files:**
- Create: `lib/sunat-igv.ts`

- [ ] **Step 1: Crear el calculador de IGV**

```typescript
import type { NubefactItem } from "./sunat-types";

type IgvType = "GRAVADO" | "EXONERADO" | "INAFECTO";

interface ItemInput {
  description: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  igvType: IgvType;
  pricesIncludeIgv: boolean;
}

const IGV_RATE = 0.18;

export function buildNubefactItem(item: ItemInput): NubefactItem {
  const { description, sku, quantity, unitPrice, igvType, pricesIncludeIgv } = item;

  let baseUnitPrice: number;
  let igvUnitAmount: number;
  let finalUnitPrice: number;

  if (igvType === "GRAVADO") {
    if (pricesIncludeIgv) {
      baseUnitPrice = round(unitPrice / (1 + IGV_RATE));
      igvUnitAmount = round(unitPrice - baseUnitPrice);
      finalUnitPrice = unitPrice;
    } else {
      baseUnitPrice = unitPrice;
      igvUnitAmount = round(unitPrice * IGV_RATE);
      finalUnitPrice = round(unitPrice + igvUnitAmount);
    }
  } else {
    baseUnitPrice = unitPrice;
    igvUnitAmount = 0;
    finalUnitPrice = unitPrice;
  }

  const subtotal = round(baseUnitPrice * quantity);
  const totalIgv = round(igvUnitAmount * quantity);
  const total = round(finalUnitPrice * quantity);

  return {
    unidad_de_medida: "NIU",
    codigo: sku || "GEN",
    descripcion: description,
    cantidad: quantity,
    valor_unitario: baseUnitPrice,
    precio_unitario: finalUnitPrice,
    subtotal,
    tipo_de_igv: igvType === "GRAVADO" ? 1 : igvType === "EXONERADO" ? 2 : 3,
    igv: totalIgv,
    total,
  };
}

export function buildTotals(items: NubefactItem[]): {
  totalGravada: number;
  totalInafecta: number;
  totalExonerada: number;
  totalIgv: number;
  total: number;
} {
  let totalGravada = 0;
  let totalInafecta = 0;
  let totalExonerada = 0;
  let totalIgv = 0;

  for (const item of items) {
    if (item.tipo_de_igv === 1) totalGravada += item.subtotal;
    else if (item.tipo_de_igv === 2) totalExonerada += item.subtotal;
    else totalInafecta += item.subtotal;
    totalIgv += item.igv;
  }

  return {
    totalGravada: round(totalGravada),
    totalInafecta: round(totalInafecta),
    totalExonerada: round(totalExonerada),
    totalIgv: round(totalIgv),
    total: round(totalGravada + totalInafecta + totalExonerada + totalIgv),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sunat-igv.ts
git commit -m "feat: add IGV calculation logic for SUNAT documents"
```

---

## Task 6: Proveedor Nubefact (`lib/sunat-nubefact.ts`)

**Files:**
- Create: `lib/sunat-nubefact.ts`

> **Nota importante:** Antes de implementar, verificar en [https://nubefact.com/api](https://nubefact.com/api) los endpoints exactos y la estructura del payload. Lo que sigue es la estructura estándar de la API v2 de Nubefact. Las URLs de sandbox son `https://demo-ose.nubefact.com/ose/api`.

- [ ] **Step 1: Crear el provider**

```typescript
import { prisma } from "./db";
import { buildNubefactItem, buildTotals } from "./sunat-igv";
import type {
  SunatProvider,
  SunatConfig,
  NubefactPayload,
  NubefactResponse,
} from "./sunat-types";
import type { DocumentType, Order, ElectronicDocument } from "@prisma/client";

type OrderWithItems = Order & {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    sku: string | null;
    productId: string | null;
  }>;
};

export class NubefactProvider implements SunatProvider {
  async emitDocument(
    order: OrderWithItems,
    type: DocumentType,
    config: SunatConfig
  ): Promise<ElectronicDocument> {
    const series = type === "BOLETA" ? config.boletaSeries : config.facturaSeries;

    // Asignar número correlativo con transacción atómica
    const doc = await prisma.$transaction(async (tx) => {
      const last = await tx.electronicDocument.findFirst({
        where: { series },
        orderBy: { number: "desc" },
      });
      const number = (last?.number ?? 0) + 1;
      const fullNumber = `${series}-${String(number).padStart(8, "0")}`;

      return tx.electronicDocument.create({
        data: {
          orderId: order.id,
          type,
          series,
          number,
          fullNumber,
          status: "PENDING",
        },
      });
    });

    try {
      // Obtener igvType de cada producto
      const productIds = order.items
        .map((i) => i.productId)
        .filter(Boolean) as string[];
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, igvType: true },
      });
      const igvMap = new Map(products.map((p) => [p.id, p.igvType]));

      const nubefactItems = order.items.map((item) => {
        const igvType = (item.productId ? igvMap.get(item.productId) : undefined) ?? "GRAVADO";
        return buildNubefactItem({
          description: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: Number(item.price),
          igvType,
          pricesIncludeIgv: config.pricesIncludeIgv,
        });
      });

      const totals = buildTotals(nubefactItems);

      // Determinar tipo de documento y datos del comprador
      const isFactura = type === "FACTURA";
      const clientDocType = isFactura ? 6 : order.customerDni ? 1 : 0;
      const clientDocNumber = isFactura
        ? (order.buyerRuc ?? "")
        : (order.customerDni ?? "");
      const clientName = isFactura
        ? (order.buyerRazonSocial ?? order.customerName)
        : order.customerName;
      const clientAddress = isFactura
        ? (order.buyerFiscalAddress ?? "")
        : "";

      const today = new Date().toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const payload: NubefactPayload = {
        operacion: "generar_comprobante",
        tipo_de_comprobante: type === "FACTURA" ? 1 : 2,
        serie: series,
        numero: doc.number,
        sunat_transaction: 1,
        cliente_tipo_de_documento: clientDocType as 0 | 1 | 6,
        cliente_numero_de_documento: clientDocNumber,
        cliente_denominacion: clientName,
        cliente_direccion: clientAddress,
        cliente_email: order.customerEmail,
        fecha_de_emision: today,
        moneda: 1,
        porcentaje_de_igv: 18.0,
        total_gravada: totals.totalGravada,
        total_inafecta: totals.totalInafecta,
        total_exonerada: totals.totalExonerada,
        total_igv: totals.totalIgv,
        total: totals.total,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: false,
        items: nubefactItems,
      };

      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const result: NubefactResponse = await response.json();

      if (!response.ok || result.codigo !== 0) {
        const errorMsg = result.errors?.join(", ") || result.sunat_description || "Error desconocido";
        return prisma.electronicDocument.update({
          where: { id: doc.id },
          data: { status: "ERROR", errorMessage: errorMsg },
        });
      }

      return prisma.electronicDocument.update({
        where: { id: doc.id },
        data: {
          status: "ISSUED",
          pdfUrl: result.enlace_del_pdf,
          xmlUrl: result.enlace_del_xml,
          cdrUrl: result.enlace_del_cdr,
          hash: result.codigo_hash,
          nubefactId: String(result.numero),
          sunatCode: result.codigo,
          issuedAt: new Date(),
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error de conexión";
      return prisma.electronicDocument.update({
        where: { id: doc.id },
        data: { status: "ERROR", errorMessage },
      });
    }
  }

  async cancelDocument(
    documentId: string,
    reason: string,
    config: SunatConfig
  ): Promise<void> {
    const doc = await prisma.electronicDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    // Nubefact: enviar comunicación de baja
    const payload = {
      operacion: "generar_anulacion",
      tipo_de_comprobante: doc.type === "FACTURA" ? 1 : 2,
      serie: doc.series,
      numero: doc.number,
      fecha_de_emision: doc.issuedAt
        ? doc.issuedAt.toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "",
      motivo: reason,
    };

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.errors?.join(", ") || "Error al anular en SUNAT");
    }

    await prisma.electronicDocument.update({
      where: { id: documentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  async resendEmail(
    documentId: string,
    email: string,
    config: SunatConfig
  ): Promise<void> {
    // El reenvío se maneja en actions/sunat.ts usando Resend directamente
    // Este método puede quedar vacío o llamar al endpoint de Nubefact si lo proveen
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sunat-nubefact.ts
git commit -m "feat: add NubefactProvider with document emission and cancellation"
```

---

## Task 7: Factory del proveedor (`lib/sunat.ts`)

**Files:**
- Create: `lib/sunat.ts`

- [ ] **Step 1: Crear la factory y el cargador de config**

```typescript
import { prisma } from "./db";
import { decrypt } from "./sunat-crypto";
import { NubefactProvider } from "./sunat-nubefact";
import type { SunatConfig, SunatProvider } from "./sunat-types";

export function getSunatProvider(): SunatProvider {
  return new NubefactProvider();
}

export async function getSunatConfig(): Promise<SunatConfig | null> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "sunat_enabled",
          "sunat_emission_mode",
          "sunat_api_key",
          "sunat_api_url",
          "sunat_ruc",
          "sunat_razon_social",
          "sunat_address",
          "sunat_boleta_series",
          "sunat_factura_series",
          "sunat_prices_include_igv",
        ],
      },
    },
  });

  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  if (!s.sunat_enabled || s.sunat_enabled !== true) return null;

  const encryptedKey = s.sunat_api_key as string;
  let apiKey = "";
  try {
    apiKey = decrypt(encryptedKey);
  } catch {
    return null;
  }

  return {
    enabled: true,
    emissionMode: (s.sunat_emission_mode as "auto" | "manual" | "mixed") ?? "manual",
    apiKey,
    apiUrl: (s.sunat_api_url as string) ?? "https://demo-ose.nubefact.com/ose/api",
    ruc: s.sunat_ruc as string,
    razonSocial: s.sunat_razon_social as string,
    address: s.sunat_address as string,
    boletaSeries: (s.sunat_boleta_series as string) ?? "B001",
    facturaSeries: (s.sunat_factura_series as string) ?? "F001",
    pricesIncludeIgv: s.sunat_prices_include_igv === true,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/sunat.ts
git commit -m "feat: add SUNAT provider factory and config loader"
```

---

## Task 8: Server actions de SUNAT (`actions/sunat.ts`)

**Files:**
- Create: `actions/sunat.ts`

- [ ] **Step 1: Crear las acciones del servidor**

```typescript
"use server";

import { prisma } from "@/lib/db";
import { getSunatProvider, getSunatConfig } from "@/lib/sunat";
import { encrypt } from "@/lib/sunat-crypto";
import { protectRoute } from "@/lib/protect-route";
import { revalidatePath } from "next/cache";
import { sendComprobanteEmail } from "@/lib/email";
import type { DocumentType } from "@prisma/client";

// ── Emitir comprobante manualmente desde admin ──────────────────
export async function emitDocumentAction(orderId: string) {
  await protectRoute("orders:update");

  const config = await getSunatConfig();
  if (!config) return { success: false, error: "Facturación electrónica no configurada" };

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order.documentType) {
    return { success: false, error: "La orden no tiene tipo de comprobante definido" };
  }

  const existing = await prisma.electronicDocument.findUnique({ where: { orderId } });
  if (existing && existing.status === "ISSUED") {
    return { success: false, error: "Ya existe un comprobante emitido para esta orden" };
  }

  const provider = getSunatProvider();
  const doc = await provider.emitDocument(order, order.documentType, config);

  if (doc.status === "ISSUED" && doc.pdfUrl) {
    await sendComprobanteEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      documentNumber: doc.fullNumber,
      total: Number(order.total),
      pdfUrl: doc.pdfUrl,
    });
  }

  revalidatePath(`/admin/ordenes/${orderId}`);
  revalidatePath("/admin/facturacion");

  return { success: true, document: doc };
}

// ── Reenviar email del comprobante ──────────────────────────────
export async function resendComprobanteEmailAction(orderId: string) {
  await protectRoute("orders:update");

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const doc = await prisma.electronicDocument.findUnique({ where: { orderId } });

  if (!doc || doc.status !== "ISSUED" || !doc.pdfUrl) {
    return { success: false, error: "No hay comprobante emitido para reenviar" };
  }

  await sendComprobanteEmail({
    to: order.customerEmail,
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    documentNumber: doc.fullNumber,
    total: Number(order.total),
    pdfUrl: doc.pdfUrl,
  });

  return { success: true };
}

// ── Anular comprobante ──────────────────────────────────────────
export async function cancelDocumentAction(documentId: string, reason: string) {
  await protectRoute("orders:update");

  const config = await getSunatConfig();
  if (!config) return { success: false, error: "Facturación electrónica no configurada" };

  const provider = getSunatProvider();
  await provider.cancelDocument(documentId, reason, config);

  revalidatePath("/admin/facturacion");

  return { success: true };
}

// ── Guardar configuración SUNAT ─────────────────────────────────
export async function saveSunatConfigAction(data: {
  enabled: boolean;
  emissionMode: "auto" | "manual" | "mixed";
  apiKey: string;
  apiUrl: string;
  ruc: string;
  razonSocial: string;
  address: string;
  boletaSeries: string;
  facturaSeries: string;
  pricesIncludeIgv: boolean;
}) {
  await protectRoute("settings:edit");

  const encryptedKey = data.apiKey.startsWith("ENC:")
    ? data.apiKey // ya cifrada (no cambió)
    : encrypt(data.apiKey);

  const entries: Array<[string, unknown]> = [
    ["sunat_enabled", data.enabled],
    ["sunat_emission_mode", data.emissionMode],
    ["sunat_api_key", encryptedKey],
    ["sunat_api_url", data.apiUrl],
    ["sunat_ruc", data.ruc],
    ["sunat_razon_social", data.razonSocial],
    ["sunat_address", data.address],
    ["sunat_boleta_series", data.boletaSeries],
    ["sunat_factura_series", data.facturaSeries],
    ["sunat_prices_include_igv", data.pricesIncludeIgv],
  ];

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value, category: "sunat" },
      })
    )
  );

  revalidatePath("/admin/configuracion/sunat");
  return { success: true };
}

// ── Probar conexión con Nubefact ────────────────────────────────
export async function testSunatConnectionAction(apiKey: string, apiUrl: string) {
  await protectRoute("settings:edit");

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({ operacion: "consultar_serie" }),
    });

    if (response.status === 401) return { success: false, error: "API Key inválida" };
    if (response.status === 404) return { success: false, error: "URL incorrecta" };

    return { success: true };
  } catch {
    return { success: false, error: "No se pudo conectar con Nubefact" };
  }
}

// ── Emitir automáticamente al confirmar pago (uso interno) ─────
export async function autoEmitOnPayment(orderId: string) {
  const config = await getSunatConfig();
  if (!config || config.emissionMode === "manual") return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order?.documentType) return;

  const isFactura = order.documentType === "FACTURA";
  if (config.emissionMode === "mixed" && isFactura) return;

  const existing = await prisma.electronicDocument.findUnique({ where: { orderId } });
  if (existing) return;

  const provider = getSunatProvider();
  const doc = await provider.emitDocument(order, order.documentType, config);

  if (doc.status === "ISSUED" && doc.pdfUrl) {
    await sendComprobanteEmail({
      to: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      documentNumber: doc.fullNumber,
      total: Number(order.total),
      pdfUrl: doc.pdfUrl,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/sunat.ts
git commit -m "feat: add SUNAT server actions (emit, cancel, resend, config, auto-emit)"
```

---

## Task 9: Template de email (`emails/comprobante-emitido.tsx`)

**Files:**
- Create: `emails/comprobante-emitido.tsx`
- Modify: `lib/email.ts`

- [ ] **Step 1: Crear template React Email**

```tsx
import {
  Html, Head, Body, Container, Section, Text,
  Heading, Button, Hr, Preview,
} from "@react-email/components";

interface ComprobanteEmitidoProps {
  customerName: string;
  orderNumber: string;
  documentNumber: string;
  total: number;
  pdfUrl: string;
}

export default function ComprobanteEmitido({
  customerName,
  orderNumber,
  documentNumber,
  total,
  pdfUrl,
}: ComprobanteEmitidoProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu comprobante de pago {documentNumber} está listo</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Heading style={{ color: "#1a1a1a" }}>Tu comprobante está listo</Heading>
          <Text>Hola {customerName},</Text>
          <Text>
            Adjuntamos tu comprobante electrónico por tu orden <strong>#{orderNumber}</strong>.
          </Text>
          <Section
            style={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "20px",
              margin: "20px 0",
            }}
          >
            <Text style={{ margin: 0 }}>
              <strong>Comprobante:</strong> {documentNumber}
            </Text>
            <Text style={{ margin: "8px 0 0" }}>
              <strong>Total:</strong> S/. {total.toFixed(2)}
            </Text>
          </Section>
          <Button
            href={pdfUrl}
            style={{
              backgroundColor: "#0070f3",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Descargar Comprobante PDF
          </Button>
          <Hr style={{ margin: "24px 0" }} />
          <Text style={{ color: "#666", fontSize: "13px" }}>
            Este comprobante fue emitido electrónicamente y es válido ante SUNAT.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Agregar función `sendComprobanteEmail` en `lib/email.ts`**

Al final del archivo `lib/email.ts` existente, agregar:

```typescript
export async function sendComprobanteEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  documentNumber: string;
  total: number;
  pdfUrl: string;
}) {
  const { default: ComprobanteEmitido } = await import("@/emails/comprobante-emitido");

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@shopgood.pe",
    to: params.to,
    subject: `Tu comprobante ${params.documentNumber} — Orden #${params.orderNumber}`,
    react: ComprobanteEmitido({
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      documentNumber: params.documentNumber,
      total: params.total,
      pdfUrl: params.pdfUrl,
    }),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add emails/comprobante-emitido.tsx lib/email.ts
git commit -m "feat: add comprobante email template and sendComprobanteEmail helper"
```

---

## Task 10: Validaciones Zod para checkout (`lib/validations.ts`)

**Files:**
- Modify: `lib/validations.ts`

- [ ] **Step 1: Agregar schemas de comprobante al archivo existente**

Al final de `lib/validations.ts`, agregar:

```typescript
export const rucSchema = z
  .string()
  .regex(/^(10|20)\d{9}$/, "RUC inválido — debe tener 11 dígitos y empezar con 10 o 20");

export const facturaDataSchema = z.object({
  buyerRuc: rucSchema,
  buyerRazonSocial: z.string().min(3, "Razón social debe tener al menos 3 caracteres").max(200),
  buyerFiscalAddress: z.string().min(5, "Dirección fiscal muy corta").max(500),
});

export const documentTypeSchema = z.discriminatedUnion("documentType", [
  z.object({ documentType: z.literal("BOLETA") }),
  z.object({
    documentType: z.literal("FACTURA"),
    buyerRuc: rucSchema,
    buyerRazonSocial: z.string().min(3).max(200),
    buyerFiscalAddress: z.string().min(5).max(500),
  }),
]);
```

- [ ] **Step 2: Actualizar `createOrderSchema` en `actions/orders.ts`**

En el schema `createOrderSchema` existente, agregar los campos opcionales de comprobante:

```typescript
// Después de couponDiscount:
documentType: z.enum(["BOLETA", "FACTURA"]).optional(),
buyerRuc: z.string().regex(/^(10|20)\d{9}$/).optional(),
buyerRazonSocial: z.string().max(200).optional(),
buyerFiscalAddress: z.string().max(500).optional(),
```

- [ ] **Step 3: Guardar campos en `createOrder` dentro de `actions/orders.ts`**

Buscar donde se hace `prisma.order.create(...)` dentro de `createOrder`. Agregar los nuevos campos en el objeto `data`:

```typescript
documentType: data.documentType ?? null,
buyerRuc: data.buyerRuc ?? null,
buyerRazonSocial: data.buyerRazonSocial ?? null,
buyerFiscalAddress: data.buyerFiscalAddress ?? null,
```

- [ ] **Step 4: Commit**

```bash
git add lib/validations.ts actions/orders.ts
git commit -m "feat: add document type fields to order creation flow"
```

---

## Task 11: Selector de comprobante en checkout

**Files:**
- Modify: `app/(checkout)/checkout/CheckoutPageClient.tsx`

- [ ] **Step 1: Agregar estado y campos de comprobante a `initialFormData`**

En `CheckoutPageClient.tsx`, localizar `initialFormData` y agregar:

```typescript
const initialFormData = {
  // ... campos existentes ...
  documentType: "BOLETA" as "BOLETA" | "FACTURA",
  buyerRuc: "",
  buyerRazonSocial: "",
  buyerFiscalAddress: "",
};
```

- [ ] **Step 2: Agregar prop `sunatEnabled` al componente**

Modificar la interface `CheckoutPageClientProps`:
```typescript
interface CheckoutPageClientProps {
  siteName: string;
  siteLogo: string;
  sunatEnabled: boolean;
}
```

Y desestructurar en la función:
```typescript
export default function CheckoutPageClient({ siteName, siteLogo, sunatEnabled }: CheckoutPageClientProps) {
```

- [ ] **Step 3: Pasar `sunatEnabled` desde `app/(checkout)/checkout/page.tsx`**

En `page.tsx` del checkout, cargar el setting antes de renderizar:

```typescript
import { prisma } from "@/lib/db";

// En el Server Component, antes del return:
const sunatSetting = await prisma.setting.findUnique({ where: { key: "sunat_enabled" } });
const sunatEnabled = sunatSetting?.value === true;

// Pasar al client component:
<CheckoutPageClient ... sunatEnabled={sunatEnabled} />
```

- [ ] **Step 4: Agregar la sección de comprobante en el JSX**

En `CheckoutPageClient.tsx`, localizar el bloque de `<Card>` de dirección/envío y agregar **después** de él, condicionado a `sunatEnabled`:

```tsx
{sunatEnabled && (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Comprobante de Pago</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="BOLETA"
            checked={formData.documentType === "BOLETA"}
            onChange={() => setFormData({ ...formData, documentType: "BOLETA" })}
          />
          <span className="text-sm font-medium">Boleta de Venta</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="FACTURA"
            checked={formData.documentType === "FACTURA"}
            onChange={() => setFormData({ ...formData, documentType: "FACTURA" })}
          />
          <span className="text-sm font-medium">Factura (requiere RUC)</span>
        </label>
      </div>

      {formData.documentType === "FACTURA" && (
        <div className="space-y-3 pt-2 border-t">
          <div>
            <Label htmlFor="buyerRuc">RUC *</Label>
            <Input
              id="buyerRuc"
              placeholder="20123456789"
              maxLength={11}
              value={formData.buyerRuc}
              onChange={(e) => setFormData({ ...formData, buyerRuc: e.target.value })}
            />
            {validationErrors.buyerRuc && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.buyerRuc}</p>
            )}
          </div>
          <div>
            <Label htmlFor="buyerRazonSocial">Razón Social *</Label>
            <Input
              id="buyerRazonSocial"
              placeholder="Mi Empresa SAC"
              value={formData.buyerRazonSocial}
              onChange={(e) => setFormData({ ...formData, buyerRazonSocial: e.target.value })}
            />
            {validationErrors.buyerRazonSocial && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.buyerRazonSocial}</p>
            )}
          </div>
          <div>
            <Label htmlFor="buyerFiscalAddress">Dirección Fiscal *</Label>
            <Input
              id="buyerFiscalAddress"
              placeholder="Av. Ejemplo 123, Lima"
              value={formData.buyerFiscalAddress}
              onChange={(e) => setFormData({ ...formData, buyerFiscalAddress: e.target.value })}
            />
            {validationErrors.buyerFiscalAddress && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.buyerFiscalAddress}</p>
            )}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

- [ ] **Step 5: Pasar campos al llamar `createOrder`**

Buscar la llamada a `createOrder(...)` dentro del handler de submit. Agregar:

```typescript
documentType: sunatEnabled ? formData.documentType : undefined,
buyerRuc: formData.documentType === "FACTURA" ? formData.buyerRuc : undefined,
buyerRazonSocial: formData.documentType === "FACTURA" ? formData.buyerRazonSocial : undefined,
buyerFiscalAddress: formData.documentType === "FACTURA" ? formData.buyerFiscalAddress : undefined,
```

- [ ] **Step 6: Commit**

```bash
git add "app/(checkout)/"
git commit -m "feat: add boleta/factura selector to checkout"
```

---

## Task 12: Panel de configuración SUNAT en admin

**Files:**
- Create: `app/admin/configuracion/sunat/page.tsx`
- Modify: `app/admin/configuracion/page.tsx`

- [ ] **Step 1: Crear `app/admin/configuracion/sunat/SunatConfigForm.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { saveSunatConfigAction, testSunatConnectionAction } from "@/actions/sunat";
import { useRouter } from "next/navigation";

// Este es un Client Component. Los datos iniciales se cargan desde un Server Component wrapper.
// Ver Step 2 para el wrapper.

interface SunatConfigFormProps {
  initialConfig: {
    enabled: boolean;
    emissionMode: string;
    apiKeyMasked: string;
    apiUrl: string;
    ruc: string;
    razonSocial: string;
    address: string;
    boletaSeries: string;
    facturaSeries: string;
    pricesIncludeIgv: boolean;
  };
}

export default function SunatConfigForm({ initialConfig }: SunatConfigFormProps) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const key = apiKey || config.apiKeyMasked;
    const result = await testSunatConnectionAction(key, config.apiUrl);
    setTestResult({ ok: result.success, msg: result.error ?? "Conexión exitosa" });
    setTesting(false);
  }

  async function handleSave() {
    setSaving(true);
    await saveSunatConfigAction({
      enabled: config.enabled,
      emissionMode: config.emissionMode as "auto" | "manual" | "mixed",
      apiKey: apiKey || config.apiKeyMasked,
      apiUrl: config.apiUrl,
      ruc: config.ruc,
      razonSocial: config.razonSocial,
      address: config.address,
      boletaSeries: config.boletaSeries,
      facturaSeries: config.facturaSeries,
      pricesIncludeIgv: config.pricesIncludeIgv,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Facturación Electrónica SUNAT</h1>
        <p className="text-muted-foreground mt-1">
          Configura la emisión de boletas y facturas electrónicas via Nubefact
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Activación</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            checked={config.enabled}
            onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
          />
          <span className="text-sm">
            {config.enabled ? "Facturación electrónica activada" : "Facturación electrónica desactivada"}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Modo de Emisión</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup
            value={config.emissionMode}
            onValueChange={(v) => setConfig({ ...config, emissionMode: v })}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="auto" id="mode-auto" />
              <Label htmlFor="mode-auto">Automático — se emite al confirmar el pago</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="manual" id="mode-manual" />
              <Label htmlFor="mode-manual">Manual — el admin emite desde el panel</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="mixed" id="mode-mixed" />
              <Label htmlFor="mode-mixed">Mixto — boletas automáticas, facturas manuales</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Credenciales Nubefact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-24">Ambiente</Label>
            <RadioGroup
              value={config.apiUrl.includes("demo") ? "sandbox" : "production"}
              onValueChange={(v) =>
                setConfig({
                  ...config,
                  apiUrl:
                    v === "sandbox"
                      ? "https://demo-ose.nubefact.com/ose/api"
                      : "https://ose.nubefact.com/ose/api",
                })
              }
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sandbox" id="env-sandbox" />
                <Label htmlFor="env-sandbox">Sandbox (pruebas)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="production" id="env-prod" />
                <Label htmlFor="env-prod">Producción</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder={config.apiKeyMasked ? "••••••••••••• (guardada)" : "Ingresa tu API Key de Nubefact"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? "Probando..." : "Probar conexión"}
            </Button>
            {testResult && (
              <Badge variant={testResult.ok ? "default" : "destructive"}>
                {testResult.msg}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Datos del Emisor</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "ruc", label: "RUC", placeholder: "20123456789" },
            { key: "razonSocial", label: "Razón Social", placeholder: "Mi Tienda SAC" },
            { key: "address", label: "Dirección Fiscal", placeholder: "Av. Lima 123, Lima" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label>{label}</Label>
              <Input
                placeholder={placeholder}
                value={(config as any)[key]}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Series</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Serie Boletas</Label>
            <Input
              value={config.boletaSeries}
              onChange={(e) => setConfig({ ...config, boletaSeries: e.target.value })}
            />
          </div>
          <div>
            <Label>Serie Facturas</Label>
            <Input
              value={config.facturaSeries}
              onChange={(e) => setConfig({ ...config, facturaSeries: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Precios</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3">
          <Switch
            checked={config.pricesIncludeIgv}
            onCheckedChange={(v) => setConfig({ ...config, pricesIncludeIgv: v })}
          />
          <span className="text-sm">
            Los precios de los productos ya incluyen IGV (18%)
          </span>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Crear el Server Component wrapper `page.tsx`**

Crear `app/admin/configuracion/sunat/page.tsx` como Server Component que carga la config y pasa al client:

```tsx
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import SunatConfigForm from "./SunatConfigForm";

export default async function SunatConfigPage() {
  await protectRoute("settings:edit");

  const settings = await prisma.setting.findMany({
    where: { category: "sunat" },
  });
  const s = Object.fromEntries(settings.map((r) => [r.key, r.value]));

  const initialConfig = {
    enabled: s.sunat_enabled === true,
    emissionMode: (s.sunat_emission_mode as string) ?? "manual",
    apiKeyMasked: s.sunat_api_key ? "ENCRYPTED" : "",
    apiUrl: (s.sunat_api_url as string) ?? "https://demo-ose.nubefact.com/ose/api",
    ruc: (s.sunat_ruc as string) ?? "",
    razonSocial: (s.sunat_razon_social as string) ?? "",
    address: (s.sunat_address as string) ?? "",
    boletaSeries: (s.sunat_boleta_series as string) ?? "B001",
    facturaSeries: (s.sunat_factura_series as string) ?? "F001",
    pricesIncludeIgv: s.sunat_prices_include_igv === true,
  };

  return <SunatConfigForm initialConfig={initialConfig} />;
}
```

> El `SunatConfigForm` ya fue creado en el directorio correcto en Step 1.

- [ ] **Step 3: Agregar tarjeta SUNAT en `app/admin/configuracion/page.tsx`**

En el array `otherSettingsOptions`, agregar:

```typescript
{
  title: "Facturación Electrónica",
  description: "Configura SUNAT y emisión de boletas/facturas via Nubefact",
  icon: FileText,
  href: "/admin/configuracion/sunat",
  color: "text-emerald-600",
  bgColor: "bg-emerald-100",
},
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/configuracion/
git commit -m "feat: add SUNAT configuration panel in admin"
```

---

## Task 13: Bloque de comprobante en detalle de orden (admin)

**Files:**
- Modify: `app/admin/ordenes/[orderId]/page.tsx`

- [ ] **Step 1: Cargar el comprobante en el Server Component**

En la query de `prisma.order.findUnique(...)`, agregar:
```typescript
include: {
  // ...includes existentes...
  electronicDocument: true,
}
```

- [ ] **Step 2: Agregar el bloque de comprobante en el JSX**

Antes del cierre del contenedor principal, agregar:

```tsx
{/* Comprobante Electrónico */}
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
              <span className="font-mono font-medium">{order.electronicDocument.fullNumber}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.electronicDocument.issuedAt?.toLocaleString("es-PE")}
            </p>
            <div className="flex gap-2 flex-wrap">
              {order.electronicDocument.pdfUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={order.electronicDocument.pdfUrl} target="_blank" rel="noopener noreferrer">
                    Descargar PDF
                  </a>
                </Button>
              )}
              {order.electronicDocument.xmlUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={order.electronicDocument.xmlUrl} target="_blank" rel="noopener noreferrer">
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
            <p className="text-sm text-red-600">{order.electronicDocument.errorMessage}</p>
            <EmitDocumentButton orderId={order.id} />
          </div>
        ) : (
          <div className="space-y-2">
            <Badge className="bg-amber-100 text-amber-700">Pendiente</Badge>
            <EmitDocumentButton orderId={order.id} />
          </div>
        )
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tipo solicitado:{" "}
            <strong>{order.documentType === "BOLETA" ? "Boleta de Venta" : "Factura"}</strong>
            {order.documentType === "FACTURA" && order.buyerRuc && (
              <> — RUC: {order.buyerRuc} ({order.buyerRazonSocial})</>
            )}
          </p>
          <EmitDocumentButton orderId={order.id} />
        </div>
      )}
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: Crear `EmitDocumentButton` y `ResendComprobanteButton` como client components**

Crear `app/admin/ordenes/[orderId]/EmitDocumentButton.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { emitDocumentAction, resendComprobanteEmailAction } from "@/actions/sunat";
import { useRouter } from "next/navigation";

export function EmitDocumentButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handle() {
    setLoading(true);
    const result = await emitDocumentAction(orderId);
    setLoading(false);
    if (!result.success) alert(result.error);
    else router.refresh();
  }

  return (
    <Button onClick={handle} disabled={loading} size="sm">
      {loading ? "Emitiendo..." : "Emitir ahora"}
    </Button>
  );
}

export function ResendComprobanteButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    await resendComprobanteEmailAction(orderId);
    setLoading(false);
    alert("Email reenviado");
  }

  return (
    <Button onClick={handle} disabled={loading} variant="outline" size="sm">
      {loading ? "Enviando..." : "Reenviar email"}
    </Button>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/admin/ordenes/"
git commit -m "feat: add comprobante block to order detail page"
```

---

## Task 14: Lista de comprobantes admin (`/admin/facturacion`)

**Files:**
- Create: `app/admin/facturacion/page.tsx`
- Modify: `app/admin/layout.tsx` (agregar link en sidebar)

- [ ] **Step 1: Crear la página**

```tsx
import { prisma } from "@/lib/db";
import { protectRoute } from "@/lib/protect-route";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FileText } from "lucide-react";

export default async function FacturacionPage() {
  await protectRoute("orders:view");

  const documents = await prisma.electronicDocument.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          total: true,
          id: true,
        },
      },
    },
  });

  const statusLabel: Record<string, { label: string; className: string }> = {
    ISSUED: { label: "Emitido", className: "bg-green-100 text-green-700" },
    PENDING: { label: "Pendiente", className: "bg-amber-100 text-amber-700" },
    ERROR: { label: "Error", className: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Anulado", className: "bg-gray-100 text-gray-700" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Facturación Electrónica
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprobantes emitidos — {documents.length} documentos
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["Fecha", "Número", "Tipo", "Cliente", "Total", "Estado", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No hay comprobantes emitidos todavía
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const st = statusLabel[doc.status] ?? statusLabel.PENDING;
                    return (
                      <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {doc.createdAt.toLocaleDateString("es-PE")}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">{doc.fullNumber}</td>
                        <td className="px-4 py-3">
                          {doc.type === "BOLETA" ? "Boleta" : "Factura"}
                        </td>
                        <td className="px-4 py-3">{doc.order.customerName}</td>
                        <td className="px-4 py-3">{formatPrice(Number(doc.order.total))}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${st.className}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {doc.pdfUrl && (
                              <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs">PDF</a>
                            )}
                            <Link href={`/admin/ordenes/${doc.order.id}`}
                              className="text-blue-600 hover:underline text-xs">Orden</Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Agregar link en el sidebar del admin**

Buscar en `app/admin/layout.tsx` (o el componente de sidebar) donde están los links de navegación. Agregar un link a `/admin/facturacion` con ícono `FileText` junto a los otros items del menú.

- [ ] **Step 3: Commit**

```bash
git add app/admin/facturacion/ app/admin/layout.tsx
git commit -m "feat: add electronic documents list page in admin"
```

---

## Task 15: Portal del cliente — descarga de comprobante

**Files:**
- Modify: `app/(shop)/cuenta/ordenes/[id]/page.tsx`

- [ ] **Step 1: Incluir `electronicDocument` en la query de la orden**

Buscar el `prisma.order.findUnique(...)` y agregar:
```typescript
include: {
  // ...existentes...
  electronicDocument: true,
}
```

- [ ] **Step 2: Agregar bloque de descarga en el JSX**

Después del bloque de items de la orden:

```tsx
{order.electronicDocument?.status === "ISSUED" && order.electronicDocument.pdfUrl && (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Comprobante de Pago</p>
          <p className="text-sm text-muted-foreground">
            {order.electronicDocument.fullNumber}
          </p>
        </div>
        <a
          href={order.electronicDocument.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Descargar PDF
        </a>
      </div>
    </CardContent>
  </Card>
)}

{order.documentType && !order.electronicDocument && (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">
        Tu comprobante está en proceso de emisión...
      </p>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(shop)/cuenta/ordenes/"
git commit -m "feat: add comprobante download to customer order detail"
```

---

## Task 16: Auto-emisión al confirmar pago

**Files:**
- Modify: `actions/pending-payments.ts`
- Modify: `actions/payments.ts` (pago con Culqi/PayPal)

- [ ] **Step 1: Llamar `autoEmitOnPayment` al aprobar pago manual (Yape/Plin)**

En `actions/pending-payments.ts`, buscar la función que aprueba un pago pendiente (cambia `paymentStatus` a `"PAID"`). Agregar **después** del `prisma.order.update(...)`:

```typescript
import { autoEmitOnPayment } from "@/actions/sunat";

// Después de actualizar el estado del pago:
await autoEmitOnPayment(orderId);
```

- [ ] **Step 2: Llamar `autoEmitOnPayment` al confirmar pago con Culqi**

En `actions/payments.ts`, buscar donde se confirma el pago con tarjeta (cuando Culqi confirma exitosamente). Agregar:

```typescript
import { autoEmitOnPayment } from "@/actions/sunat";

// Después de marcar la orden como pagada:
await autoEmitOnPayment(order.id);
```

- [ ] **Step 3: Commit**

```bash
git add actions/pending-payments.ts actions/payments.ts
git commit -m "feat: wire auto-emission on payment confirmation"
```

---

## Task 17: Verificación final

- [ ] **Step 1: Build de producción sin errores**

```bash
npm run build
```

Verificar que no hay errores de TypeScript ni de build.

- [ ] **Step 2: Verificar en dev server**

```bash
npm run dev
```

Recorrido mínimo de verificación:
1. Ir a `/admin/configuracion/sunat` — debe cargar el formulario
2. Ingresar API Key de sandbox de Nubefact, presionar "Probar conexión"
3. Activar el módulo y guardar
4. Ir al checkout `/checkout` — debe aparecer la sección de comprobante
5. Elegir "Factura" — deben aparecer los campos RUC, Razón Social, Dirección
6. Crear una orden de prueba
7. Ir a `/admin/ordenes/[id]` — debe aparecer el bloque de comprobante
8. Presionar "Emitir ahora" — debe llamar a Nubefact sandbox
9. Verificar que el documento aparece en `/admin/facturacion`
10. Ir a `/cuenta/ordenes/[id]` — debe aparecer botón de descarga PDF

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: complete SUNAT electronic invoicing integration"
```

---

## Notas de Implementación

### Nubefact API
Antes de implementar Task 6, verificar en la documentación oficial de Nubefact:
- URL exacta de sandbox y producción
- Estructura exacta del payload (puede variar por versión de API)
- Códigos de error específicos
- Proceso de cancelación (comunicación de baja)

### Permisos RBAC
Si el sistema requiere permisos específicos para la facturación, agregar en `scripts/setup-permissions.ts`:
```typescript
{ key: "sunat:view", name: "Ver comprobantes", module: "sunat", action: "view" },
{ key: "sunat:emit", name: "Emitir comprobantes", module: "sunat", action: "emit" },
{ key: "sunat:cancel", name: "Anular comprobantes", module: "sunat", action: "cancel" },
```

### Boletas sin datos de comprador
Para boletas con total ≤ S/. 700, si el cliente no ingresó DNI:
- `cliente_tipo_de_documento: 0` (sin documento)
- `cliente_numero_de_documento: ""`
- `cliente_denominacion: "CLIENTE VARIOS"`

Esto ya está contemplado en la lógica del `NubefactProvider` (Task 6, `clientDocType = 0` cuando no hay DNI).
