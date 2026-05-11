# Plantillas de Formulario COD — Diseño

**Fecha**: 2026-05-03
**Branch**: `feature/product-customizer` (continuación) → futuro `feature/cod-form-templates`
**Autor**: dennewsusa@gmail.com
**Estado**: Draft (pendiente de revisión)

## 1. Contexto y problema

Hoy el formulario COD (Pago Contra Entrega) vive embebido en cada producto a través de `Product.codFormSettings` (Json). Cuando el admin quiere usar el mismo formulario en varios productos debe duplicar la configuración manualmente en cada uno.

La estructura actual del JSON (`CodFormSettings`) mezcla en un solo objeto:

- Textos del formulario (`formTitle`, `formSubtitle`, `buttonText`, `paymentBadge`)
- Pantalla de agradecimiento (`thankYouTitle`, `thankYouMessage`)
- Configuración de WhatsApp (`whatsappEnabled`, `whatsappNumber`, `whatsappMessage`)
- Lista de campos con orden y reglas (`fields[]` — 8 IDs fijos: name, phone, email, dni, location, address, reference, notes)
- Restricción geográfica de envío (`shippingRestriction`)

Limitaciones reales:

- **No es reutilizable**: cada producto tiene su propia copia del formulario.
- **Lista de campos rígida**: solo 8 IDs predefinidos sin posibilidad de cambiar tipos de bloque.
- **Sin separación de responsabilidades**: la restricción geográfica de envío está acoplada al formulario COD, pero conceptualmente pertenece al producto y debería aplicar también al checkout normal.
- **Editor pobre**: lista plana sin vista previa, sin customización visual del botón, sin bloques estructurales (encabezado, carrito, opciones de envío, resumen).

El objetivo es **extraer** el formulario COD a una entidad propia (`CodFormTemplate`) gestionable desde admin, reutilizable entre productos, con un editor estilo page-builder con vista previa instantánea, y mover la restricción geográfica al producto para que aplique a todo flujo de compra.

## 2. Decisiones tomadas durante el brainstorming

| # | Pregunta | Decisión |
|---|---|---|
| 1 | Datos legacy | No hay productos con `codFormSettings` configurado en producción. Migración limpia, sin preservación de datos. |
| 2 | Restricciones de envío | Se mueven al `Product` (campo `shippingRestriction` Json). Aplican a flujo COD y a checkout normal. |
| 3 | Sección admin | Top-level: `/admin/formularios-cod` (mismo patrón que `/admin/guias-tallas`). |
| 4 | Asignación de plantilla | Auto-asignar plantilla "Default" cuando se activa COD sin selección explícita. La Default no se puede eliminar; sí se puede editar. |
| 5 | Bulk assign | Disponible desde `/admin/productos` (extender `BulkEditModal`) y desde `/admin/formularios-cod/[id]` (tab "Productos asignados"). Mismo backend. La operación cambia plantilla y `checkoutMode` en una sola acción. |
| 6 | Editor | Page-builder dedicado con bloques tipados, drag-and-drop, vista previa instantánea y edición individual por bloque. Reusa primitivas de `lib/blocks/` y `components/admin/page-builder/`. |
| 7 | Tipos de bloque | 5 estructurales (HEADER, CART_ITEMS, SHIPPING_OPTIONS, ORDER_SUMMARY, SUBMIT_BUTTON) + 10 de input (FIELD_NAME, FIELD_PHONE, FIELD_EMAIL, FIELD_DNI, FIELD_ADDRESS, FIELD_ADDRESS_2, FIELD_PROVINCE, FIELD_CITY, FIELD_REFERENCE, FIELD_NOTES). |
| 8 | Customización del botón | Rica: color de texto/fondo/borde, ancho de borde, esquinas redondeadas, sombra, animación, ícono de lucide-react. |
| 9 | Selector de países | Excluido de V1. ShopGood opera solo en Perú; se evalúa con multi-tenant futuro. |
| 10 | "Cobertura de envío" en plantilla | Excluido. La restricción geográfica vive en el producto (decisión 2). |
| 11 | Vista previa | Render client-side instantáneo (lee del store Zustand del editor, no iframe). |
| 12 | Iconografía | lucide-react en toda la UI. Sin emojis ni en código ni en UI. |
| 13 | Acción al confirmar el pedido | Radio único con 3 opciones: `INLINE_THANK_YOU`, `WHATSAPP_REDIRECT`, `THANK_YOU_PAGE`. Configurable desde un ícono de engranaje en el toolbar del editor. |
| 14 | Comportamiento post-submit | INLINE: oculta form y muestra título + mensaje. WHATSAPP: abre `wa.me` en nueva pestaña + oculta form y muestra título + mensaje. PAGE: redirige a una `Page` del sitio. |
| 15 | Página de agradecimiento | Solo `Page` del sitio (dropdown desde `/admin/paginas`). Sin URL externa en V1. |
| 16 | Validación de spec | `npm run build` + smoke test manual. No hay tests automatizados (per `CLAUDE.md`). |

## 3. Modelo de datos

### 3.1 Prisma

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

model CodFormTemplate {
  id               String           @id @default(cuid())
  name             String           @unique
  isDefault        Boolean          @default(false)

  buttonText       String
  buttonStyle      Json             @default("{}")

  postSubmitAction PostSubmitAction @default(INLINE_THANK_YOU)
  thankYouTitle    String?
  thankYouMessage  String?          @db.Text
  whatsappNumber   String?
  whatsappMessage  String?          @db.Text
  thankYouPageId   String?
  thankYouPage     Page?            @relation(fields: [thankYouPageId], references: [id], onDelete: SetNull)

  blocks           CodFormBlock[]
  products         Product[]

  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@index([isDefault])
}

model CodFormBlock {
  id         String           @id @default(cuid())
  templateId String
  template   CodFormTemplate  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  order      Int
  type       CodFormBlockType
  content    Json             @default("{}")
  visible    Boolean          @default(true)
  required   Boolean          @default(false)

  @@index([templateId, order])
}

model Product {
  // ... campos existentes ...
  // ELIMINAR: codFormSettings Json?

  codFormTemplateId   String?
  codFormTemplate     CodFormTemplate? @relation(fields: [codFormTemplateId], references: [id], onDelete: SetNull)
  shippingRestriction Json?

  @@index([codFormTemplateId])
}

model Page {
  // ... campos existentes ...

  // Relación inversa requerida por Prisma para CodFormTemplate.thankYouPage
  codFormTemplates CodFormTemplate[]
}
```

### 3.2 Forma del JSON `buttonStyle`

```ts
type ButtonStyle = {
  textColor: string         // ej. "#ffffff"
  fontSize: number          // px
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  bgColor: string           // ej. "#000000"
  borderColor: string
  borderWidth: number       // px
  borderRadius: number      // px
  shadow: number            // 0-10
  animation: 'none' | 'pulse' | 'shake' | 'bounce'
  icon: string | null       // nombre de ícono lucide-react
  subtitle: string | null
}
```

### 3.3 Forma del JSON `content` por tipo de bloque

```ts
type HeaderContent = {
  text: string
  align: 'left' | 'center' | 'right'
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  color: string
}

type FieldContent = {
  label: string
  placeholder: string
  errorMessage: string
  hideLabel: boolean
}

type OrderSummaryContent = {
  showSubtotal: boolean
  showDiscount: boolean
  showShipping: boolean
  showTotal: boolean
}

type CartItemsContent = {
  showThumbnail: boolean
  showVariant: boolean
  showQuantitySelector: boolean
}

type ShippingOptionsContent = {
  showFreeShipping: boolean
}

type SubmitButtonContent = {
  // SUBMIT_BUTTON usa CodFormTemplate.buttonText y CodFormTemplate.buttonStyle
  // Su content queda vacío; es bloque singleton (uno por plantilla, obligatorio)
}
```

### 3.4 Forma del JSON `Product.shippingRestriction`

```ts
type ShippingRestriction = {
  enabled: boolean
  allowedDepartmentIds: string[]
  allowedProvinceIds: string[]
  allowedDistrictCodes: string[]
  restrictionMessage: string | null
}
```

(Misma estructura que ya existe en `lib/types/cod-form.ts`, solo se mueve de scope.)

### 3.5 Reglas de integridad

- `CodFormTemplate` con `isDefault: true` es **única** (un solo registro). Al ejecutar el seed, se garantiza que existe.
- Eliminar la plantilla `Default` está prohibido (validación en server action retorna error).
- `CodFormBlock` con `type: SUBMIT_BUTTON` es **singleton por plantilla** (la plantilla siempre tiene exactamente uno; no se puede agregar otro ni eliminar el existente).
- Al guardar un `Product` con `checkoutMode != STANDARD` y `codFormTemplateId == null`, el server action auto-asigna el `id` de la plantilla `Default`.
- Si `Page` referenciada por `thankYouPageId` se elimina, el FK queda en `null` y el server action de runtime hace fallback a `INLINE_THANK_YOU` con un mensaje genérico.

## 4. UI del admin

### 4.1 Listado: `/admin/formularios-cod`

Tabla con columnas:

| Nombre | Acción al confirmar | Productos asignados | Acciones |
|---|---|---|---|
| Default | Mensaje en pantalla | 12 | Editar, Duplicar |
| Promo Lima | WhatsApp | 3 | Editar, Duplicar, Eliminar |

- "Default" se marca con un ícono de estrella y el botón Eliminar queda deshabilitado.
- Botón superior "+ Nueva plantilla" abre el editor con valores por defecto (clona la Default).
- Click en una fila navega al editor.

### 4.2 Editor: `/admin/formularios-cod/[id]`

**Layout split-screen** (50/50):

- **Toolbar superior**:
  - Botón "Volver" a `/admin/formularios-cod`
  - Nombre de la plantilla (editable inline)
  - Ícono de engranaje → abre popover "Acción al confirmar el pedido" (radio único con las 3 opciones)
  - Indicador de auto-save: "Guardando..." / "Guardado"

- **Panel izquierdo (editor)**:
  - **Sección "Botón de compra"** (colapsable): customización rica del SUBMIT_BUTTON. Edita `CodFormTemplate.buttonText` y `CodFormTemplate.buttonStyle`.
  - **Sección "Formulario"**: lista drag-and-drop de bloques. Cada bloque muestra ícono de tipo, label corto, y tres acciones (editar / mostrar-ocultar / eliminar). Botón "+ Agregar nuevos campos" abre selector con tipos disponibles (excluyendo los singleton ya presentes y el SUBMIT_BUTTON).
  - **Tab inferior "Productos asignados"** (cuando se hace clic): cambia el contenido del panel izquierdo a la lista de productos con la plantilla asignada. Botón "+ Asignar productos" abre modal con buscador multi-select.

- **Panel derecho (vista previa)**:
  - Render client-side instantáneo del formulario tal como lo verá el cliente.
  - Reusa `CodFormBlockRenderer` (mismo componente del storefront).
  - Producto mock con datos de ejemplo (nombre "Producto de ejemplo", precio S/ 99.90, imagen placeholder).
  - Al editar cualquier campo, la vista se actualiza al toque sin esperar guardado.

### 4.3 Edición individual de bloque (al hacer clic en el ícono de editar)

Panel deslizante desde la derecha (cubre temporalmente la vista previa) con campos según el tipo:

**Para FIELD_*:**
- Toggle "Marcar este campo como obligatorio"
- Toggle "Ocultar etiqueta"
- Input "Título"
- Input "Marcador de posición"
- Input "Mensaje de error"

**Para HEADER:**
- Textarea "Texto"
- Selector de alineación (izquierda / centro / derecha)
- Input numérico "Tamaño" (px)
- Toggles "Negrita" / "Cursiva"
- Color picker "Color del texto"

**Para CART_ITEMS / SHIPPING_OPTIONS / ORDER_SUMMARY:**
- Toggles de visibilidad de sub-elementos (ver sección 3.3)

Al cerrar el panel, los cambios persisten al store y la vista previa los refleja.

### 4.4 Popover "Acción al confirmar el pedido" (ícono de engranaje)

Radio único con 3 secciones (solo la seleccionada muestra sus campos):

```
( ) Enviar a WhatsApp
    Número:           [+51999999999          ]
    Mensaje WhatsApp: [textarea con variables]
    ─── Agradecimiento que ve el cliente en pantalla ───
    Título:           [¡Gracias por tu pedido!]
    Mensaje:          [textarea                ]

( ) Redirigir a página de agradecimiento
    Página:           [dropdown de Pages ▼    ]

(•) Mostrar agradecimiento encima del formulario
    Título:           [¡Gracias por tu pedido!]
    Mensaje:          [textarea                ]
```

**Notas:**
- Los textos `thankYouTitle` y `thankYouMessage` aplican a `INLINE_THANK_YOU` y `WHATSAPP_REDIRECT` (en ambos casos el formulario desaparece y se muestra ese mensaje en pantalla). Solo `THANK_YOU_PAGE` los ignora porque redirige a otra página.
- `whatsappMessage` es el texto pre-rellenado que se manda al link `wa.me` (lo ve el cliente al abrir WhatsApp). Es distinto de `thankYouMessage` (lo que se queda en la página del modal después de redirigir).

### 4.5 Bulk assign

**Desde `/admin/productos` (BulkEditModal extendido):**

- Checkbox para seleccionar productos en la lista (UX existente).
- Botón "Editar masivo" abre modal con campos:
  - Dropdown "Plantilla COD" (opciones: existentes + "Sin cambios")
  - Toggle "Cambiar checkoutMode" → Radio (STANDARD / COD_ONLY / COD_AND_CART)
- Botón confirmar muestra resumen ("Asignar plantilla X a 12 productos. ¿Confirmas?") antes de aplicar.

**Desde `/admin/formularios-cod/[id]` tab "Productos asignados":**

- Lista de productos con la plantilla actual.
- Botón "+ Asignar productos" abre modal con buscador + multi-select.
- Botón "Quitar de plantilla" en cada fila reasigna el producto a la plantilla `Default`.

Ambos flujos llaman al mismo server action `assignTemplateToProducts(templateId, productIds, checkoutMode?)`.

### 4.6 Permisos RBAC

Permisos nuevos siguiendo el patrón existente (formato dot en wire, colon interno):

| Permiso | Roles que lo tienen |
|---|---|
| `cod-forms.view` | Staff, Editor, Manager, Admin |
| `cod-forms.create` | Manager, Admin |
| `cod-forms.update` | Editor, Manager, Admin |
| `cod-forms.delete` | Manager, Admin |

Super Admin (level 100+) bypass automático.

## 5. Storefront

### 5.1 Componentes

- **`components/shop/CodOrderModal.tsx`** (actualizado): recibe `product.codFormTemplate` (con `blocks` ordenados) en lugar de `product.codFormSettings`. Renderiza la lista de bloques.
- **`components/shop/cod-form/CodFormBlockRenderer.tsx`** (nuevo): switch sobre `block.type` que delega al componente correspondiente.
- **`components/shop/cod-form/blocks/*.tsx`** (nuevos): un componente por tipo:
  - `HeaderBlock`, `CartItemsBlock`, `ShippingOptionsBlock`, `OrderSummaryBlock`, `SubmitButtonBlock`
  - `FieldBlock` (recibe `type` para discriminar entre los 10 FIELD_*)

Bloques con `visible: false` no se renderizan. El orden de renderizado lo define `block.order`.

### 5.2 Validación de `shippingRestriction`

- **Cliente**: al cambiar el campo "Provincia/Ciudad" del formulario, se valida contra `product.shippingRestriction`. Si la ubicación no está permitida, se muestra el `restrictionMessage` y se deshabilita el botón submit.
- **Servidor**: `actions/cod-orders.ts` re-valida la restricción antes de crear el pedido.
- **Reutilización**: `actions/orders.ts` (checkout normal) usa la misma función. Garantiza que un producto restringido no se pueda comprar por ninguna vía.
- **Función compartida**: `lib/products/shipping-restriction.ts` exporta `validateShippingRestriction(product, location)`.

### 5.3 Comportamiento post-submit

| `postSubmitAction` | Comportamiento en el frontend |
|---|---|
| `INLINE_THANK_YOU` | Oculta el formulario; muestra `thankYouTitle` + `thankYouMessage` dentro del modal. |
| `WHATSAPP_REDIRECT` | Abre `https://wa.me/{number}?text={mensaje encoded}` en nueva pestaña; oculta el formulario; muestra `thankYouTitle` + `thankYouMessage`. |
| `THANK_YOU_PAGE` | Cierra el modal y hace `router.push('/[slug-de-la-page]')`. |

Si `THANK_YOU_PAGE` se selecciona pero la `Page` referenciada no existe (FK quedó en null), el server action loggea el problema y el cliente cae a `INLINE_THANK_YOU` con mensaje genérico.

### 5.4 Variables de plantilla

Soportadas en `whatsappMessage`, `thankYouMessage` y `buttonText` (donde aplique):

- `{nombre}`, `{telefono}`, `{direccion}`, `{distrito}`, `{total}`, `{producto}`, `{pedido}`, `{referencia}`

Las mismas que ya soporta el sistema actual.

### 5.5 Tipos en frontend

En `lib/types/cod-form.ts` (refactorizado):

```ts
type CodFormBlock = {
  id: string
  order: number
  type: CodFormBlockType
  content: BlockContent  // unión discriminada por type
  visible: boolean
  required: boolean
}

type CodFormTemplateData = {
  id: string
  name: string
  isDefault: boolean
  buttonText: string
  buttonStyle: ButtonStyle
  postSubmitAction: 'INLINE_THANK_YOU' | 'WHATSAPP_REDIRECT' | 'THANK_YOU_PAGE'
  thankYouTitle: string | null
  thankYouMessage: string | null
  whatsappNumber: string | null
  whatsappMessage: string | null
  thankYouPageId: string | null
  thankYouPageSlug: string | null  // resuelto en el server al cargar
  blocks: CodFormBlock[]
}

type ShippingRestriction = { ... }  // movido del archivo actual
```

El tipo `CodFormSettings` se elimina por completo.

## 6. Migración y despliegue

### 6.1 Estrategia: expand-contract

Como no hay datos legacy (decisión 1), la migración es directa pero se ejecuta en dos fases para minimizar riesgo:

**Migración 1 — Expand:**
- Crear enums `CodFormBlockType` y `PostSubmitAction`
- Crear tablas `CodFormTemplate` y `CodFormBlock`
- Añadir `Product.codFormTemplateId` (nullable, FK)
- Añadir `Product.shippingRestriction` (Json nullable)
- Mantener `Product.codFormSettings` durante esta fase (por seguridad)

**Migración 2 — Contract** (después de validar en producción):
- Drop `Product.codFormSettings`

### 6.2 Scripts de inicialización

**`scripts/seed-cod-form-default.ts`** — idempotente:
- Si no existe `CodFormTemplate` con `isDefault: true`, lo crea.
- Inserta los bloques por defecto en orden:
  1. `HEADER` con texto "Favor ingresar tus datos para realizar el pedido"
  2. `CART_ITEMS`
  3. `SHIPPING_OPTIONS`
  4. `ORDER_SUMMARY`
  5. `FIELD_NAME` (required: true)
  6. `FIELD_PHONE` (required: true)
  7. `FIELD_ADDRESS` (required: true)
  8. `FIELD_REFERENCE`
  9. `SUBMIT_BUTTON` con texto "Realizar Pedido y Pagar al Recibir - {total}"

**`scripts/setup-cod-forms-permissions.ts`** — idempotente:
- Crea permisos `cod-forms:view`, `cod-forms:create`, `cod-forms:update`, `cod-forms:delete`.
- Asigna a roles según la matriz de la sección 4.6.

### 6.3 Plan de despliegue

1. PR con código + migración 1 (expand) + scripts de seed/permisos.
2. Merge → `npx prisma migrate deploy` en producción.
3. Ejecutar `npx tsx scripts/setup-cod-forms-permissions.ts`.
4. Ejecutar `npx tsx scripts/seed-cod-form-default.ts`.
5. Smoke test manual:
   - Crear plantilla nueva en `/admin/formularios-cod`.
   - Asignarla a un producto desde `/admin/productos`.
   - Comprar como cliente y probar las 3 acciones post-submit.
   - Probar bulk assign de varios productos.
   - Probar `shippingRestriction` en COD y en checkout normal.
6. Una vez verificado, PR separado con migración 2 (contract: drop `codFormSettings`).

### 6.4 Server actions y API

**`actions/cod-form-templates.ts`** (nuevo):

- `listTemplates()` — listado para `/admin/formularios-cod`
- `getTemplate(id)` — para el editor
- `createTemplate(data)` — crear plantilla nueva
- `updateTemplate(id, data)` — auto-save desde el editor
- `duplicateTemplate(id)` — botón duplicar
- `deleteTemplate(id)` — bloquea si `isDefault`; reasigna productos a Default antes de eliminar
- `assignTemplateToProducts(templateId, productIds, checkoutMode?)` — bulk assign
- `unassignProductsFromTemplate(templateId, productIds)` — reasigna a Default

Todas usan `requirePermission()` con los nuevos permisos.

### 6.5 Validaciones Zod

En `lib/validations/cod-form-template.ts` (nuevo):

- Schema para `CodFormTemplate` (nombre único, `postSubmitAction` válida, `thankYouPageId` existe si action es `THANK_YOU_PAGE`, etc.)
- Schema para `CodFormBlock` (`type` válido, `content` matchea el shape esperado por type)
- Schema para `ShippingRestriction` (movido desde `lib/types/cod-form.ts`)

Validación se aplica en server actions y API routes — nunca confiar en el cliente.

### 6.6 Verificación

- `npm run build` (type check) en cada paso de implementación.
- Smoke test manual en navegador después del despliegue (sección 6.3 paso 5).
- Validación de que `Product.codFormSettings` queda con 0 referencias en código antes de la migración 2.

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Plantilla Default no existe cuando un producto intenta usarla | Script seed idempotente se ejecuta antes de habilitar el feature; server action valida en runtime y crea Default si falta. |
| `shippingRestriction` movida al producto rompe checkout normal | Smoke test del checkout normal con producto restringido y sin restricción. Función de validación compartida garantiza paridad COD/checkout normal. |
| Bulk assign aplica plantilla incorrecta a muchos productos | Modal pide confirmación con resumen ("Asignar plantilla X a 12 productos. ¿Confirmas?") antes de ejecutar. |
| Eliminar plantilla con productos asignados deja productos huérfanos | Server action reasigna automáticamente esos productos a `Default` antes de eliminar. UI muestra advertencia con conteo. |
| Vista previa client-side se desincroniza del render real | Mismo `CodFormBlockRenderer` se usa en admin y en storefront — un solo componente, una sola fuente de verdad. |
| `Page` referenciada por `thankYouPageId` se elimina | FK con `onDelete: SetNull`. En runtime, el storefront cae a `INLINE_THANK_YOU` con mensaje genérico si la Page no existe. |
| Singleton `SUBMIT_BUTTON` se duplica o elimina | Server action de `updateTemplate` valida antes de persistir: rechaza si hay 0 o más de 1 `SUBMIT_BUTTON`. |

## 8. Out of scope (V2)

- **Multi-país** (selector de países en el editor): no se incluye en V1; se evaluará con la futura migración multi-tenant.
- **URL externa para `THANK_YOU_PAGE`**: en V1 solo se soporta `Page` del sitio; no se permite pegar una URL arbitraria.
- **Variables de plantilla custom**: se mantienen las 8 actuales (`{nombre}`, `{telefono}`, etc.). No se permiten variables custom definidas por el admin.
- **A/B testing de plantillas**: no se permite asignar múltiples plantillas al mismo producto con split de tráfico.
- **Versionado de plantillas**: cuando se edita una plantilla, los productos asignados ven los cambios al instante. Sin historial ni rollback.
- **Bloques custom por producto** (overrides): si un producto necesita bloques diferentes, se crea una plantilla nueva. No se soportan overrides puntuales sobre la plantilla compartida.
- **Restricción geográfica a nivel categoría**: la restricción se configura por producto. No se hereda por categoría en V1.

## 9. Archivos afectados (resumen)

**Nuevos:**

- `prisma/migrations/<timestamp>_add_cod_form_templates/migration.sql`
- `prisma/migrations/<timestamp>_drop_product_cod_form_settings/migration.sql`
- `scripts/seed-cod-form-default.ts`
- `scripts/setup-cod-forms-permissions.ts`
- `actions/cod-form-templates.ts`
- `app/admin/formularios-cod/page.tsx`
- `app/admin/formularios-cod/[id]/page.tsx`
- `components/admin/cod-form-builder/` (carpeta completa: editor, sidebar, canvas, controles)
- `components/shop/cod-form/CodFormBlockRenderer.tsx`
- `components/shop/cod-form/blocks/*.tsx`
- `lib/products/shipping-restriction.ts`
- `lib/validations/cod-form-template.ts`

**Modificados:**

- `prisma/schema.prisma`
- `lib/types/cod-form.ts` (refactor completo, elimina `CodFormSettings`)
- `components/shop/CodOrderModal.tsx`
- `components/admin/NewProductForm.tsx` (reemplaza `CodFormConfig` con dropdown de plantillas + card "Cobertura de envío")
- `components/admin/EditProductForm.tsx` (igual que arriba)
- `components/admin/BulkEditModal.tsx` (añade campos plantilla COD + checkoutMode)
- `actions/cod-orders.ts` (recibe template; valida shippingRestriction del producto)
- `actions/orders.ts` (añade validación de shippingRestriction en checkout normal)
- `actions/products.ts` (auto-asigna Default cuando checkoutMode != STANDARD y no hay template)
- `app/(shop)/productos/[slug]/page.tsx` (incluye codFormTemplate en el query)
- `components/shop/templates/ProductLandingView.tsx`
- `components/shop/templates/ProductStandardView.tsx`
- `components/shop/ProductActions.tsx`
- `app/api/admin/products/create/route.ts`
- `app/api/admin/products/[productId]/update/route.ts`

**Eliminados:**

- `components/admin/CodFormConfig.tsx` (reemplazado por el editor de plantilla)
