# Facturación Electrónica SUNAT

**Fecha:** 2026-04-22  
**Estado:** Aprobado — pendiente de implementación  
**OSE:** Nubefact (arquitectura extensible para futuros proveedores)

---

## Contexto

ShopGood PE es una plataforma SaaS de e-commerce. Cada tienda suscrita opera con su propio RUC y emite sus propios comprobantes electrónicos. La plataforma provee el motor de integración; cada dueño de tienda conecta sus credenciales Nubefact.

---

## Arquitectura

### Patrón: adaptador con interfaz limpia

Se implementa Nubefact directamente pero detrás de una interfaz `SunatProvider`. Cuando se necesite un segundo OSE (Alegra, Facturalo Pro), se extrae el adaptador sin tocar la lógica de negocio.

```typescript
interface SunatProvider {
  emitDocument(order: Order, type: DocumentType): Promise<ElectronicDocument>
  cancelDocument(documentId: string, reason: string): Promise<void>
  getDocumentStatus(nubefactId: string): Promise<string>
  resendEmail(documentId: string, email: string): Promise<void>
}
```

`NubefactProvider` implementa `SunatProvider`. Se instancia desde `lib/sunat.ts` según la configuración activa.

---

## Base de Datos

### Nuevos campos en `Product`

```prisma
igvType  IgvType  @default(GRAVADO)

enum IgvType {
  GRAVADO    // 18% IGV normal
  EXONERADO  // 0% — alimentos básicos, libros, medicamentos
  INAFECTO   // no sujeto a IGV
}
```

### Nuevos campos en `Order`

```prisma
documentType         DocumentType?
buyerRuc             String?
buyerRazonSocial     String?
buyerFiscalAddress   String?
electronicDocument   ElectronicDocument?   // back-relation

enum DocumentType {
  BOLETA
  FACTURA
}
```

### Nuevo modelo `ElectronicDocument`

```prisma
model ElectronicDocument {
  id                 String       @id @default(cuid())
  orderId            String       @unique
  order              Order        @relation(fields: [orderId], references: [id])

  type               DocumentType
  series             String       // "B001" | "F001"
  number             Int          // correlativo
  fullNumber         String       // "B001-00000001"

  status             DocStatus    @default(PENDING)

  xmlContent         String?      @db.Text
  pdfUrl             String?
  xmlUrl             String?
  cdrUrl             String?
  sunatCode          Int?         // 0 = aceptado por SUNAT
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

enum DocStatus {
  PENDING    // en cola, no emitido aún
  ISSUED     // emitido y aceptado por SUNAT
  CANCELLED  // anulado con comunicación de baja
  ERROR      // falló la emisión
}
```

### Configuración (tabla `Setting` existente)

| Clave | Tipo | Descripción |
|-------|------|-------------|
| `sunat_enabled` | boolean | Activa/desactiva el módulo |
| `sunat_emission_mode` | `"auto" \| "manual" \| "mixed"` | Modo de emisión |
| `sunat_api_key` | string (cifrado) | API Key de Nubefact |
| `sunat_api_url` | string | URL sandbox o producción de Nubefact |
| `sunat_ruc` | string | RUC del emisor |
| `sunat_razon_social` | string | Razón social del emisor |
| `sunat_address` | string | Dirección fiscal del emisor |
| `sunat_boleta_series` | string | Serie boletas (ej. "B001") |
| `sunat_factura_series` | string | Serie facturas (ej. "F001") |
| `sunat_prices_include_igv` | boolean | Si los precios ya incluyen IGV |

---

## Lógica de Cálculo IGV

```
Si igvType = GRAVADO y prices_include_igv = true:
  base  = precio / 1.18
  igv   = precio - base
  total = precio

Si igvType = GRAVADO y prices_include_igv = false:
  base  = precio
  igv   = precio * 0.18
  total = precio + igv

Si igvType = EXONERADO o INAFECTO:
  base  = precio
  igv   = 0
  total = precio
```

Estos valores se calculan por ítem al construir el payload para Nubefact.

---

## Numeración Correlativa

El número de serie es un requisito legal — no puede haber saltos ni duplicados. La asignación se hace dentro de una transacción Prisma atómica:

```typescript
const doc = await prisma.$transaction(async (tx) => {
  const last = await tx.electronicDocument.findFirst({
    where: { series },
    orderBy: { number: "desc" },
  });
  const number = (last?.number ?? 0) + 1;
  return tx.electronicDocument.create({ data: { series, number, ... } });
});
```

---

## Modos de Emisión

| Modo | Boleta | Factura |
|------|--------|---------|
| `auto` | Se emite al confirmar pago | Se emite al confirmar pago |
| `manual` | Admin emite desde panel | Admin emite desde panel |
| `mixed` | Se emite automáticamente | Admin emite desde panel |

En modo `auto` y `mixed`, la emisión se dispara en el webhook/action de confirmación de pago.

---

## Flujo de Checkout

Se agrega una sección **"Comprobante de pago"** después de la dirección de envío, **solo si `sunat_enabled = true`**. Si el módulo está desactivado, la sección no aparece y no se solicita tipo de documento.

### Selector
- Radio: **Boleta de Venta** / **Factura**
- Si elige Factura: campos RUC (11 dígitos, empieza en 10 o 20), Razón Social, Dirección Fiscal

### Validaciones (Zod en `lib/validations.ts`)
| Campo | Regla |
|-------|-------|
| RUC | 11 dígitos, `/^(10\|20)\d{9}$/` |
| Razón Social | Requerido si factura, min 3 chars |
| Dirección fiscal | Requerido si factura |
| DNI del comprador | Requerido en boleta si total > S/. 700 (SUNAT) |

---

## Admin Panel

### `/admin/configuracion/sunat`
- Toggle ON/OFF del módulo
- Selector de modo de emisión (automático / manual / mixto)
- Formulario de credenciales Nubefact (sandbox / producción)
- Datos del emisor (RUC, razón social, dirección)
- Series (boletas / facturas)
- Toggle precios incluyen IGV
- Botón **"Probar conexión"** — ping al sandbox Nubefact, muestra resultado
- Botón **"Guardar cambios"**

### `/admin/ordenes/[orderId]` — bloque nuevo
Si comprobante emitido:
- Número, tipo, estado, fecha
- Botones: Descargar PDF, Descargar XML, Reenviar email

Si pendiente (modo manual):
- Muestra tipo solicitado y datos del comprador
- Botón **"Emitir ahora"**

Si error:
- Muestra mensaje de error de Nubefact
- Botón **"Reintentar"**

### `/admin/facturacion` — nueva sección
- Lista de todos los comprobantes emitidos
- Filtros: fecha, tipo (boleta/factura), estado
- Exportable a CSV para contabilidad
- Columnas: Fecha, Número, Tipo, Cliente, Total, Estado

---

## Portal del Cliente

### `/cuenta/ordenes/[id]`
Bloque nuevo debajo del detalle de la orden:
- Si emitido: número del comprobante, fecha, botón **"Descargar PDF"**
- Si pendiente: mensaje "Comprobante en proceso de emisión..."

---

## Email al Cliente

Se usa el sistema Resend existente (`lib/email.ts`). Se envía al confirmar emisión del comprobante.

**Contenido:**
- Número del comprobante
- Total
- Fecha de emisión
- Link de descarga del PDF (URL de Nubefact)

---

## Archivos a Crear / Modificar

| Archivo | Acción |
|---------|--------|
| `prisma/schema.prisma` | Agregar `ElectronicDocument`, campos en `Order` y `Product` |
| `lib/sunat.ts` | Instancia del provider activo |
| `lib/sunat-nubefact.ts` | `NubefactProvider implements SunatProvider` |
| `lib/sunat-types.ts` | Interfaz `SunatProvider`, enums, tipos |
| `lib/validations.ts` | Schema Zod para RUC y datos de factura |
| `lib/sunat-igv.ts` | Lógica de cálculo IGV por ítem |
| `actions/sunat.ts` | emit, cancel, resend, getStatus |
| `app/admin/configuracion/sunat/page.tsx` | Panel de configuración |
| `app/admin/facturacion/page.tsx` | Lista de comprobantes |
| `app/(checkout)/` | Agregar selector boleta/factura |
| `app/(shop)/cuenta/ordenes/[id]/page.tsx` | Bloque de descarga |
| `emails/comprobante-emitido.tsx` | Template email Resend |

---

## Consideraciones de Seguridad

- El `sunat_api_key` se cifra con AES-256 usando una clave del servidor (`SUNAT_ENCRYPTION_KEY` en `.env`) antes de guardarse en la tabla `Setting`. Nunca se almacena en texto plano.
- La API Key nunca se expone al cliente (solo se usa en server actions y `lib/sunat-nubefact.ts`)
- Validación de RUC con regex en frontend (Zod) + backend (server action)
- Las URLs de PDF/XML de Nubefact son públicas con token temporal — no exponen datos sensibles adicionales

## Manejo de Errores

- Si Nubefact devuelve error, el `ElectronicDocument` queda en estado `ERROR` con el mensaje en `errorMessage`
- En modo `auto`, el admin ve el error en el detalle de orden y puede reintentar con el botón **"Reintentar"**
- Los errores no bloquean ni cancelan la orden — la venta es independiente del comprobante
- Cancelaciones: SUNAT permite anular dentro de 7 días. La comunicación de baja se envía a Nubefact con `cancellationReason`
