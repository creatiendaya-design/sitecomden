# Auditoría integral de arquitectura, seguridad y procesos eCommerce

- **Proyecto:** `shopgood-pe`
- **Fecha:** 2026-07-27
- **Rama:** `master`
- **Commit auditado:** `d5a6698`
- **Estado inicial del repositorio:** limpio
- **Modalidad:** revisión estática, trazado de flujos y pruebas no destructivas
- **Alcance de escritura autorizado:** únicamente este informe, `auditoriados.md`

> Esta auditoría sustituye la versión anterior. La versión previa se usó como
> referencia, pero cada conclusión abierta se volvió a contrastar con el código
> actual. Las correcciones incorporadas en `0078334` y `ecbbc67` se consideran
> presentes en el repositorio, no necesariamente desplegadas ni migradas en
> producción.

## 1. Resumen ejecutivo

`shopgood-pe` es una beta funcional avanzada construida como monolito modular
con Next.js y PostgreSQL. La base arquitectónica es adecuada para un MVP y, con
trabajo adicional, para una tienda mediana. No hay justificación actual para
dividirla en microservicios.

La revisión confirma mejoras importantes desde la auditoría anterior:

- Checkout estándar y COD tienen clave de idempotencia.
- Los importes, tarifas, promociones y relaciones producto-variante se
  recalculan en servidor.
- El descuento y la restauración de inventario usan operaciones atómicas y
  ledger.
- Culqi, Mercado Pago y PayPal comparten un claim de pago que no revive órdenes
  canceladas o reembolsadas.
- Las reservas de pasarela tienen vencimiento y un barrido idempotente.
- Los ajustes absolutos de stock usan transacción y compare-and-swap.
- PayPal contrasta monto y moneda; los webhooks consultan al proveedor.
- Cancelar una orden pagada mediante la Server Action principal está impedido.

La nueva auditoría, sin embargo, encontró dos caminos alternativos que anulan
parte de esas garantías:

1. `uploadPaymentProof` permite que el dueño del `viewToken` vuelva a poner en
   `pending/VERIFYING` un pago Yape/Plin ya verificado o rechazado. Una nueva
   aprobación vuelve a descontar el inventario.
2. `/api/admin/orders/update-status` escribe cualquier estado validado
   directamente, sin la máquina de estados, sin control de coherencia y sin
   restauración/reembolso. Un usuario con `orders:update` todavía puede cancelar
   una orden pagada o marcar una pendiente como entregada.

También continúan abiertos los reembolsos monetarios multi-pasarela, las
devoluciones, el fulfillment por cantidades, la persistencia de eventos de
webhook, la conciliación de órdenes `VERIFYING`, el rate limiting resiliente y
la preparación operativa.

**Resultado técnico de esta ejecución:**

- Pruebas unitarias: **23 archivos, 245 pruebas, 245 aprobadas**.
- TypeScript: **sin errores**.
- ESLint: **0 errores y 3 advertencias**.
- Build: **completado**, pero con errores de conexión TLS a PostgreSQL
  absorbidos por fallbacks durante el prerender.
- E2E Playwright: **no concluyeron**; timeout a 180 s por la misma imposibilidad
  local de conectar a PostgreSQL/Neon. No se contabilizan como aprobados.
- Dependencias de producción: **5 alertas** (`3 High`, `2 Moderate`,
  `0 Critical`).

## 2. Veredicto general

**No preparado.**

La base es más madura que un prototipo, pero los bypasses de estado/pago manual
y la ausencia de procesos postventa impiden operar una tienda real sin riesgo
material de pérdida de dinero, inventario e historial.

## 3. Nivel de confianza

**Medio.**

Confianza alta en los hallazgos derivados directamente del código y las 245
pruebas unitarias. Confianza media en el sistema desplegado porque no se
verificaron:

- Migraciones y datos de la base de producción.
- Secrets y configuración real de Vercel, GitHub Actions y proveedores.
- Webhooks públicos con eventos sandbox reales.
- Cobros, reembolsos y conciliaciones contra cuentas sandbox.
- Backups, restauración, alertas, RPO/RTO y rollback.
- E2E completos; el entorno local no pudo abrir TLS hacia PostgreSQL.

## 4. Arquitectura identificada

- **Aplicación:** Next.js 16.2.12, React 19.2.3 y TypeScript.
- **Estilo:** monolito modular con App Router, Server Components, Server Actions
  y Route Handlers.
- **Persistencia:** Prisma 6.19.1 sobre PostgreSQL/Neon.
- **Frontend:** Tailwind CSS, shadcn/Radix, Zustand y React Hook Form.
- **Clientes:** Clerk.
- **Administración:** autenticación propia con bcrypt, cookie HttpOnly, sesión
  opaca persistida y RBAC.
- **Pagos:** Culqi, Mercado Pago, PayPal, Yape, Plin y contra entrega.
- **Archivos:** Vercel Blob y Cloudflare Stream.
- **Correo:** Resend.
- **Rate limiting:** Upstash Redis.
- **Observabilidad:** Pino, request ID y Sentry opcional.
- **Facturación:** SUNAT/Nubefact.
- **Despliegue:** Vercel; GitHub Actions para CI y tareas programadas.

Adecuación:

| Escenario | Evaluación |
|---|---|
| MVP controlado | Arquitectura adecuada; procesos críticos aún no |
| Tienda mediana | Adecuada tras cerrar integridad, postventa y operación |
| Marketplace | No; no hay vendedores, comisiones, payouts ni segregación |
| SaaS multiempresa | No; no existe `tenantId` ni aislamiento por tienda |
| Alta concurrencia | No verificado; faltan carga, colas, outbox e inbox |

## 5. Mapa de módulos y responsabilidades

| Módulo | Archivos principales | Responsabilidad | Evaluación |
|---|---|---|---|
| Catálogo | `app/api/admin/products/**`, `actions/products*`, `prisma/schema.prisma` | Productos, variantes, categorías e importación | Amplio; validación de variantes incompleta |
| Carrito | `store/cart.ts`, `Cart`, `CartItem` | Carrito local y modelos persistentes | Modelo DB desconectado |
| Checkout | `actions/orders.ts`, `actions/cod-orders.ts`, `actions/orders-schema.ts` | Total, envío, pedido, reserva y COD | Bien defendido; deuda histórica |
| Inventario | `lib/inventory/**`, `actions/inventory.ts` | Decremento, ajuste, liberación y restauración | Fuerte en concurrencia; sin ubicaciones |
| Pagos | `actions/payments.ts`, `lib/payments/**`, `lib/{paypal,mercadopago}/**` | Confirmación y verificación | Mejorado; bypass en comprobantes manuales |
| Webhooks | `app/api/{culqi,webhooks}/**` | Eventos de proveedor | Verificación razonable; sin inbox/DLQ |
| Pedidos | `actions/orders.ts`, `app/api/admin/orders/**` | Estados y fulfillment | Dos implementaciones divergentes |
| Reembolsos | `actions/refunds.ts`, `lib/orders/apply-refund.ts` | Refund total y efectos | Dinero automático solo Mercado Pago |
| Clientes | Clerk, `actions/customers.ts`, lealtad | Cuenta, CRM y puntos | Parcial; ciclo de privacidad incompleto |
| Administración | `lib/auth.ts`, `lib/admin-session.ts`, roles/permisos | Autenticación y RBAC | Bueno en base; sin MFA y con permisos amplios |
| Media | `app/api/upload`, `actions/media*`, `lib/media/**` | Imagen, SVG y video | Buena validación; autorización mejorable |
| Operación | Sentry, Pino, workflows y migraciones | CI, cron, errores | Parcial; sin health ni DR demostrados |

## 6. Flujo actual del proceso eCommerce

Flujo principal:

```text
Catálogo → carrito local → checkout → recálculo servidor
→ pedido + inventario/ledger en transacción
→ pasarela o verificación manual
→ claim de pago → lealtad/SUNAT/email
→ preparación/envío/entrega
→ reembolso total parcial en funcionalidad, sin dominio de devolución
```

### Trazabilidad de los 20 flujos obligatorios

| # | Proceso | Entrada, archivos y entidades | Tx, validación y autorización | Eventos, errores, estado final y faltantes |
|---:|---|---|---|---|
| 1 | Crear producto | `POST /api/admin/products/create`; `Product`, categorías, opciones | `requirePermission("products:create")`, Zod y `$transaction` | Crea activo; puede quedar `hasVariants=true` sin variantes |
| 2 | Crear variantes | Mismo endpoint; `ProductVariant`, `ProductOption` | Dentro de tx; campos de variante proceden de `data.variants` con controles manuales | SKU único; combinaciones y estructura no se validan integralmente |
| 3 | Asignar inventario | `actions/inventory.ts` → `setStockAbsolute`; `Product/Variant`, `InventoryMovement` | Permiso, tx y CAS con reintento | Ajuste auditable; sin almacenes ni stock en tránsito |
| 4 | Agregar al carrito | `store/cart.ts`; estado Zustand | Cliente; límites locales | Persiste invitado; servidor revalida al comprar; no fusiona carrito autenticado |
| 5 | Crear checkout | `/checkout` → `createOrder` | Zod, rate limit, idempotencia | Puede fallar por precio, zona, stock o promoción |
| 6 | Calcular total | `actions/orders.ts:186-496` | Precios, envío, cupones y promociones desde BD | Total autoritativo; moneda implícita PEN |
| 7 | Crear pedido | `actions/orders.ts:548-676`; `Order`, `OrderItem` | `$transaction`, índice único de idempotencia | `PENDING`; snapshot parcial sin SKU autoritativo |
| 8 | Iniciar pago | Culqi action, preferencias MP, orden PayPal, pago manual | Monto desde orden; proveedor externo | `PENDING→VERIFYING` o redirect; timeout Culqi queda para conciliación |
| 9 | Recibir webhook | rutas Culqi/MP/PayPal | Firma donde existe y consulta al proveedor | Sin inbox persistente, replay log ni DLQ |
| 10 | Confirmar pago | `claimOrderAsPaid`, confirmadores y verificador manual | CAS para pasarelas; tx para Yape/Plin | `PAID`; el reenvío del comprobante puede reabrir Yape/Plin |
| 11 | Descontar inventario | `decrementStockAtomic` | Guarda `stock >= quantity`, tx y ledger | Correcto en checkout/COD/aprobación manual; doble decremento posible por A-01 |
| 12 | Preparar pedido | `updateOrderStatus` | Permiso `orders:update_status` | `PAID→PROCESSING`; sin tareas, picking ni cantidades |
| 13 | Enviar pedido | Server Action y `/mark-shipped` | Exige pago; no modela líneas enviadas | `SHIPPED/FULFILLED`; email best-effort |
| 14 | Marcar entrega | `updateOrderStatus` y endpoint heredado | Acción principal verifica coherencia; endpoint heredado no | `DELIVERED`; sin prueba de transportista |
| 15 | Cancelar pedido | Acción principal + `releaseOrderStock` | Claim transaccional; impide pagada en acción principal | Endpoint heredado omite esas garantías |
| 16 | Reembolsar | `refundOrder` → MP API → `applyRefund` | `orders:refund`; claim `PAID`; tx de efectos | Automático solo MP; otros se marcan internamente antes de confirmar dinero |
| 17 | Devolver producto | Solo página/política | Sin entidad, endpoint ni autorización | Ausente |
| 18 | Restaurar inventario | `restoreStockForOrder`, `releaseOrderStock` | Tx, ledger e idempotencia por referencia | Total; no hay cantidades aceptadas/dañadas de devolución |
| 19 | Notificar cliente | `lib/email`, Resend, efectos postpago | Plantillas; fallos best-effort | Sin outbox, reintento persistente ni deduplicación global |
| 20 | Auditar admin | `logAudit`, `AuditLog` | 49 consumidores más helper | Cobertura amplia pero no universal; endpoints heredados solo usan `console` |

## 7. Procesos completos

Completos a nivel de código actual, con la salvedad de no haber probado
proveedores reales:

- Creación de pedido estándar con recálculo de precio y envío en servidor.
- Creación COD con descuento atómico de stock.
- Idempotencia de creación de orden por clave única.
- Relación producto-variante validada en checkout.
- Decremento atómico de inventario y movimiento de venta.
- Ajuste absoluto de inventario con transacción y CAS.
- Liberación/restauración idempotente desde el ledger.
- Reserva con vencimiento para CARD, Mercado Pago y PayPal.
- Claim atómico de pago de pasarelas.
- Verificación de monto/moneda en PayPal y de monto/orden en Culqi/MP.
- Protección de acceso público al pedido por `viewToken` o cookie HttpOnly.
- Login administrativo con bcrypt, mensajes no enumerables y sesión revocable.
- Validación de imágenes raster por tamaño y magic bytes; sanitización de SVG.

“Completo” aquí significa conectado en el código revisado, no certificado en
producción.

## 8. Procesos incompletos

- Pagos Yape/Plin: la aprobación es transaccional, pero el comprobante puede
  reabrir estados terminales.
- Reembolso total: efectos internos idempotentes, dinero automático solo MP.
- Estados de pedido: la Server Action es coherente, las rutas heredadas no.
- Fulfillment: un estado global y tracking, sin cantidades ni envíos parciales.
- Reserva: implementada, pero despliegue del cron/migración no verificado y
  `VERIFYING` depende de intervención humana.
- Carrito: invitado local; modelos persistentes sin integración ni fusión.
- Historial de pedido: nombre, imagen y precio autoritativos; SKU ausente y
  `variantOptions` todavía procede del payload.
- Restricciones de envío: distrito soportado; departamento/provincia no se
  resuelven en checkout estándar.
- Notificaciones: conectadas, pero sin outbox/retries durables.
- Auditoría administrativa: amplia, no universal.
- Clientes: cuenta y pedidos, sin exportación/eliminación autoservicio completa.
- CI: lint, unit y build; E2E no se ejecutan.

## 9. Procesos ausentes

- `Return` y `ReturnItem`.
- Solicitud, aprobación, recepción e inspección de devolución.
- Cambios de producto/variante.
- Reembolsos parciales y múltiples.
- Contracargos y disputas.
- Shipment/FulfillmentItem con cantidades y múltiples despachos.
- Inventario por ubicación, transferencias y stock en tránsito/dañado separado.
- Gift cards y crédito de tienda.
- Ledger normalizado `Payment/Transaction/Refund`.
- Inbox de webhooks, worker, reintentos controlados y dead-letter queue.
- Conciliación automática de pagos e inventario.
- Health, readiness y liveness.
- Runbooks, RPO/RTO y evidencia de restauración.
- Marketplace y multiempresa.

## 10. Bloqueadores para producción

1. Cerrar la reapertura de pagos manuales y probarla contra reenvíos/concurrencia.
2. Eliminar o delegar los endpoints heredados de estado en una única máquina de
   estados transaccional.
3. Integrar reembolso monetario por proveedor y estados
   `REFUND_PENDING/REFUND_FAILED`.
4. Implementar devoluciones y fulfillment por cantidades.
5. Añadir conciliación operativa para `VERIFYING` y cobros huérfanos.
6. Persistir y reprocesar eventos de webhook.
7. Verificar migración, cron, secrets y alertas en staging.
8. Ejecutar E2E con PostgreSQL y proveedores sandbox estables.

## 11. Vulnerabilidades críticas

### A-01 — Reapertura y reproceso de pagos manuales

`actions/pending-payments.ts:62-65` autoriza por `orderId + viewToken`, pero no
comprueba el estado actual. Las líneas `104-119` escriben incondicionalmente
`PendingPayment.status="pending"` y `Order.paymentStatus="VERIFYING"`.
Posteriormente, `lib/payments/verify-pending-payment.ts:75-123` vuelve a reclamar
ese estado y descuenta otra vez todos los ítems.

Escenario: un cliente conserva el token de su orden Yape/Plin aprobada, reenvía
otro comprobante y un administrador lo aprueba. La misma orden vuelve a restar
inventario. Tras un rechazo también puede reabrir una orden cancelada.

## 12. Vulnerabilidades altas

- **A-02:** `/api/admin/orders/update-status` omite transiciones, coherencia,
  refund, ledger y auditoría. Requiere permiso administrativo, pero permite
  pérdida financiera por error, abuso o sesión comprometida.
- **A-03:** `actions/refunds.ts:48-68` solo devuelve dinero por API en Mercado
  Pago; los demás métodos pasan a `REFUNDED` aunque el dinero quede manual.
- **A-04:** sin dominio de devolución no se pueden limitar cantidades,
  inspeccionar ni impedir doble restock.
- **A-05:** sin ShipmentItem un administrador no puede controlar cantidades
  enviadas o envíos parciales.
- **A-06:** `lib/rate-limit.ts:233-247` permite todo si Redis falta o falla,
  incluso login y checkout.
- **A-07:** Culqi deja deliberadamente resultados indeterminados en `VERIFYING`;
  el barrido los excluye y no existe cola, SLA ni reconciliador persistente.
- **A-08:** MP/PayPal responden 503 en fallos reintentables, pero dependen de la
  retención del proveedor; no hay inbox, backoff propio ni DLQ.
- **A-09:** `Order.version` existe, pero no gobierna todas las escrituras; rutas
  y actions pueden sobrescribirse.
- **A-10:** `npm audit --omit=dev` confirma 3 High y 2 Moderate en el árbol de
  producción. `next` aparece sin fix automático; contiene `postcss@8.4.31` y
  `sharp@0.34.5`.
- **A-11:** el panel administrativo propio no implementa MFA para operaciones
  críticas.

## 13. Vulnerabilidades medias

- Upload general usa `requireAuth`, no un permiso `media:create`.
- Mutaciones del formulario legal de reclamos usan solo autenticación.
- El token de `AdminSession` se almacena recuperable en BD.
- No hay constraints SQL para monto total, descuentos, precio o cantidad
  estrictamente no negativos.
- Rutas diagnósticas de Clerk siguen compilándose; dos usan `notFound` en
  producción, pero `/test-simple` y `/test-server-auth` siguen expuestas.
- Upload público de reseñas puede dejar blobs huérfanos; el rate limit hereda el
  modo fail-open.
- No se encontró validación explícita de `Origin`/CSRF; `SameSite=Lax` reduce el
  riesgo para cookies administrativas, pero requiere prueba.

## 14. Vulnerabilidades bajas

- `/api/test` confirma públicamente la presencia de la aplicación.
- Logs heredados con `console` reducen estructura y correlación.
- La CSP permite `style-src 'unsafe-inline'`, necesario para la UI actual pero
  más débil frente a inyección de estilos.
- El middleware intenta filtrar payloads por patrones de URL; es defensa
  secundaria y puede generar falsos positivos, no sustituye validación.

## 15. Riesgos de integridad de datos

- A-01 puede duplicar movimientos `SALE` y reducir stock dos veces.
- A-02 permite estados imposibles sin efectos asociados.
- `PendingPayment.status` es `String`, no enum ni máquina de estados.
- `Order.version` no se aplica uniformemente.
- `OrderItem.variantOptions` aún puede diferir de la variante vendida y `sku`
  no se llena en el checkout.
- `deleteZeroStockProducts` usa borrado físico; las cascadas eliminan
  `InventoryMovement` y debilitan el historial.
- No hay checks SQL de cantidades y totales.
- No hay modelos relacionales para transacciones, refunds o shipments.

## 16. Riesgos de pérdida de dinero

- Orden cancelada/entregada arbitrariamente por el endpoint heredado.
- Refund interno sin devolución monetaria confirmada en Culqi, PayPal, Yape,
  Plin o COD.
- Cobro indeterminado en `VERIFYING` sin SLA/alerta demostrada.
- Fallo entre refund externo MP y efectos internos exige intervención manual.
- Webhook agotado o evento fuera de retención puede dejar dinero y orden
  divergentes.
- La ausencia de devolución parcial obliga a procesos manuales propensos a
  sobre-reembolso.

## 17. Riesgos de pérdida de inventario

- Doble decremento por reapertura de comprobante.
- Cancelación heredada no libera inventario.
- `VERIFYING` puede retener stock indefinidamente.
- Borrado físico de producto en stock cero elimina movimientos por cascada.
- Sin inventario por ubicación no se conoce disponibilidad real por almacén.
- Sin ReturnItem no existe una cantidad autoritativa a restaurar ni clasificación
  de dañado/no vendible.

## 18. Riesgos de privacidad

- Sesiones administrativas recuperables si se exfiltra la base.
- Datos de clientes, pedidos y comprobantes dependen de retención no documentada.
- No se verificó exportación o eliminación completa de datos del cliente.
- Comprobantes de Yape/Plin se almacenan en Blob público.
- Las rutas diagnósticas de autenticación aumentan superficie innecesaria.
- No se verificaron DPA, retención de logs o acceso operativo a proveedores.

## 19. Riesgos operativos

- La migración `20260727020000_order_reservation_expires_at` no fue comprobada
  contra una base desplegada.
- El cron requiere coincidencia de `CRON_SECRET` y `PRODUCTION_URL`.
- El workflow horario puede tardar hasta casi una hora adicional en liberar.
- No hay health/readiness/liveness.
- No hay evidencia de backup/restauración ni runbooks.
- El build termina aun cuando múltiples consultas Prisma fallan durante el
  prerender; esto puede ocultar configuración rota.
- `vercel.json` usa `prisma migrate deploy && next build`, mientras
  `scripts/vercel-build.mjs` implementa warmup/retry. Debe verificarse cuál
  ejecuta realmente Vercel para evitar falsa resiliencia.

## 20. Problemas de rendimiento

- Catálogo grande, reportes, exportaciones y búsquedas no tienen prueba de carga.
- Existen consultas `findMany` administrativas cuya paginación no es uniforme.
- Correos, SUNAT, lealtad y tracking se ejecutan en el ciclo de petición, aunque
  varios sean best-effort.
- El barrido procesa una transacción por orden; correcto para aislamiento, pero
  requiere métricas al crecer.
- El storefront depende fuertemente de BD y no todas las lecturas tienen
  fallback; la indisponibilidad local produjo HTTP 500.

## 21. Problemas de escalabilidad

- No hay colas para efectos externos.
- No hay outbox/inbox.
- No hay circuit breakers uniformes.
- No existe particionamiento por tienda ni tenant.
- Carrito local no se comparte entre dispositivos.
- Inventario y fulfillment globales no soportan múltiples almacenes.
- La conciliación manual no escala con volumen de pagos.

## 22. Problemas de mantenibilidad

- Dos caminos para cambiar estados: Server Action protegida y API heredada
  insegura.
- Estados se representan en Prisma, mapas locales y strings de
  `PendingPayment`.
- El informe anterior mezclaba estado original y apéndices posteriores; este
  documento lo reemplaza con una sola fotografía.
- Comentarios prometen comportamientos que dependen de configuración externa.
- `actions/orders.ts` concentra checkout, estados, emails, lealtad y consultas.
- Existen componentes heredados sin consumidores aparentes que aún mantienen
  endpoints desplegados.
- Tres advertencias de lint siguen abiertas.

## 23. Pruebas faltantes

- Regresión para reenvío de comprobante después de `verified/rejected`.
- Autorización y transiciones de `/api/admin/orders/update-status`.
- Concurrencia entre cancelación, refund, aprobación manual y webhook.
- Integración real con PostgreSQL para transacciones y locks.
- E2E de checkout completo con cada método.
- Sandbox de cobro/refund Culqi, MP y PayPal.
- Webhooks duplicados, fuera de orden y agotamiento de reintentos.
- Refund parcial y devolución parcial, hoy inexistentes.
- Fulfillment por cantidades.
- Caída de Redis, Resend, SUNAT, Blob, DB y proveedor.
- Restore de backup.
- Matriz negativa de roles/permisos.
- E2E en CI: `.github/workflows/ci.yml` solo ejecuta lint, unit y build.
- Métrica de cobertura; no se generó para no escribir artefactos adicionales.

## 24. Tabla de hallazgos

| ID | Categoría | Severidad | Estado | Archivo/línea | Evidencia | Escenario | Impacto | Probabilidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A-01 | Pago manual/inventario | Critical | CONFIRMED | `actions/pending-payments.ts:62-119`; `lib/payments/verify-pending-payment.ts:75-123` | Reescribe `verified/rejected` a `pending` y vuelve a descontar | Cliente reenvía comprobante y admin reaprueba | Doble stock y estados corruptos | Media | Guardar solo si pago/orden siguen pendientes; CAS transaccional; prueba de replay | Bajo | P0 |
| A-02 | Pedidos | High | CONFIRMED | `app/api/admin/orders/update-status/route.ts:21-52` | `order.update` directo sin transiciones ni efectos | Staff cancela pagada o entrega pendiente | Dinero, stock y logística divergentes | Alta | Eliminar ruta o delegar en servicio único | Bajo | P0 |
| A-03 | Reembolsos | High | CONFIRMED | `actions/refunds.ts:12-15,48-68` | Refund monetario automático solo MP | Admin marca refund Culqi/PayPal sin devolver dinero | Pérdida/reclamo y contabilidad falsa | Alta | Estados pending/failed + adaptador por proveedor + conciliación | Alto | P0 |
| A-04 | Devoluciones | High | CONFIRMED | Ausencia en `prisma/schema.prisma` y rutas | No hay `Return/ReturnItem` | Se procesa fuera del sistema | Doble restock/sobre-refund | Alta | Implementar dominio completo | Alto | P1 |
| A-05 | Fulfillment | High | CONFIRMED | `prisma/schema.prisma:344-355`; rutas de envío | Solo estado global y tracking | Se marca todo enviado sin cantidades | Sobreenvío e historial insuficiente | Media | `Shipment` y `FulfillmentItem` | Alto | P1 |
| A-06 | Rate limit | High | CONFIRMED | `lib/rate-limit.ts:233-247` | Ausencia/caída Redis devuelve success | Brute force o spam durante incidente | Abuso y coste | Media | Fallback local y fail-closed selectivo | Medio | P1 |
| A-07 | Conciliación | High | CONFIRMED | `actions/payments.ts:75-95`; `reservation-policy.ts:70-86` | `VERIFYING` se excluye del sweep | Timeout sin webhook deja orden eterna | Stock retenido/cobro incierto | Media | Cola de conciliación, SLA y alerta | Medio | P0 |
| A-08 | Webhooks | High | CONFIRMED | rutas MP/PayPal; sin modelo Event | Solo reintento del proveedor | Retención agotada o evento perdido | Pago y orden divergen | Media | Inbox idempotente, worker y DLQ | Alto | P1 |
| A-09 | Concurrencia de estados | High | CONFIRMED | `schema.prisma:394`; múltiples writers | `version` no se usa en todas las escrituras | Dos admins/procesos se pisan | Estado perdido | Media | Servicio único + optimistic lock | Medio | P0 |
| A-10 | Supply chain | High | CONFIRMED | `package-lock.json`; `npm audit` | 3 High y 2 Moderate; Next incluye PostCSS/Sharp vulnerables | Entrada alcanza componente afectado | XSS/lectura/seguridad de imagen | Baja-Media | Vigilar release de Next, evaluar override probado y mitigaciones | Medio | P1 |
| A-11 | MFA admin | High | CONFIRMED | `app/api/admin/login/route.ts:12-109` | Login propio sin segundo factor | Contraseña robada concede sesión | Control total según rol | Media | MFA obligatorio para roles críticos | Alto | P1 |
| A-12 | Carrito | Medium | CONFIRMED | `store/cart.ts`; `schema.prisma:697-720` | Modelos DB sin consumidores del flujo | Login/dispositivo pierde carrito | Conversión y consistencia | Alta | Integrar persistencia/fusión o retirar modelos | Medio | P3 |
| A-13 | Catálogo | Medium | CONFIRMED | `validations.ts:199-222`; create `:143-211` | `hasVariants` no exige arrays no vacíos | Producto activo no vendible | Error comercial | Media | Refinement y tx que exijan combinación válida | Bajo | P1 |
| A-14 | Snapshot | Medium | CONFIRMED | `actions/orders.ts:600-617` | `variantOptions` cliente y SKU ausente | Payload altera metadato histórico | Disputa/fulfillment ambiguo | Media | Snapshot completo desde variante BD | Bajo | P1 |
| A-15 | Envío | Medium | CONFIRMED | `actions/orders.ts:484-489` | Pasa dept/provincia como null | Restricción por región falla | Rechazo incorrecto de venta | Media | Resolver jerarquía por `districtCode` | Bajo | P2 |
| A-16 | Integridad SQL | Medium | CONFIRMED | modelos `Order`/`OrderItem` | Sin CHECK comerciales | Script/migración inserta negativos | Datos inválidos | Baja | CHECK de total, precio, qty, descuentos | Medio | P2 |
| A-17 | Media authz | Medium | CONFIRMED | `app/api/upload/route.ts:56-59` | Solo autenticación | Staff mínimo sube contenido público | Abuso de storage/contenido | Media | Permiso específico | Bajo | P2 |
| A-18 | Formulario legal | Medium | CONFIRMED | complaints fields `route.ts:30-67` | Solo `requireAuth`, campos directos | Staff altera libro de reclamaciones | Riesgo legal/operativo | Media | Permiso y Zod estricto | Bajo | P2 |
| A-19 | Sesión admin | Medium | CONFIRMED | `schema.prisma:875-887`; `admin-session.ts:33-43` | Token se guarda en claro | Lectura DB permite secuestro | Acceso admin | Baja | Guardar hash del token | Medio | P2 |
| A-20 | Borrado/ledger | Medium | CONFIRMED | `actions/inventory.ts:489-514`; schema `665-681` | Hard delete + cascade de movimientos | Limpieza de stock cero borra trazabilidad | Auditoría incompleta | Media | Soft delete y retener ledger | Bajo | P1 |
| A-21 | Notificaciones | Medium | CONFIRMED | efectos postpedido/refund | Envío best-effort sin outbox | Caída de Resend pierde correo | Soporte y cumplimiento | Alta | Outbox con idempotencia/reintento | Medio | P2 |
| A-22 | Ledger de pagos | Medium | CONFIRMED | `Order.paymentId/paymentDetails`; `PendingPayment` | Sin Payment/Transaction/Refund normalizados | Conciliar parciales/chargeback es manual | Contabilidad débil | Alta | Ledger financiero inmutable | Alto | P1 |
| A-23 | Operación | Medium | NOT VERIFIED | Infraestructura externa | Sin evidencia de restore/RPO/RTO | Pérdida o corrupción de BD | Parada prolongada | Media | Backup y simulacro documentado | Medio | P1 |
| A-24 | Health | Medium | CONFIRMED | ausencia en `app/api` | No hay readiness/liveness | Deploy sirve aunque DB falle | Incidente tardío | Alta | Health autenticado y probes | Bajo | P1 |
| A-25 | Despliegue | Medium | PROBABLE | `vercel.json`; `scripts/vercel-build.mjs` | Dos estrategias de build/migrate | Retry previsto no se ejecuta | Deploy fallido o migración pendiente | Media | Una única orden de build verificada | Bajo | P1 |
| A-26 | E2E/CI | Medium | CONFIRMED | `.github/workflows/ci.yml`; `playwright.config.ts` | E2E existen pero CI no los llama | Regresión de compra llega a master | Fallo funcional | Alta | Job E2E con DB aislada | Medio | P1 |
| A-27 | Diagnóstico | Low | CONFIRMED | `/test-simple`, `/test-server-auth`, `/api/test` | Rutas de prueba en build de producción | Fingerprinting/información innecesaria | Superficie adicional | Media | Excluir o proteger | Bajo | P3 |
| A-28 | Privacidad | Medium | NOT VERIFIED | cuenta/CRM | No se demostró exportación/eliminación integral | Solicitud del titular no atendible | Riesgo regulatorio | Media | Flujo y política de retención | Medio | P2 |
| A-29 | Inventario multiubicación | Medium | CONFIRMED | esquema de producto/variante | Un único contador global | Dos almacenes venden stock incorrecto | Sobreventa/operación manual | Media | InventoryLevel por ubicación | Alto | P2 |
| A-30 | E2E local | Informational | REQUIRES TEST | Playwright + entorno local | Timeout por TLS a PostgreSQL | No se pudo validar navegador | Incertidumbre residual | Alta | Entorno de pruebas aislado y estable | Medio | P1 |

## 25. Matriz de procesos eCommerce

| Proceso | Implementado | Integrado | Probado | Seguro | Idempotente | Transaccional | Observable | Preparado para producción |
|---|---|---|---|---|---|---|---|---|
| Producto | Sí | Sí | Parcial | Parcial | N/A | Sí | Parcial | Parcial |
| Variantes | Sí | Sí | Parcial | Parcial | N/A | Sí | Parcial | No |
| Inventario de venta | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Parcial |
| Ajuste inventario | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Parcial |
| Reserva/expiración | Sí | Sí | Sí unitario | Parcial | Sí | Sí | Parcial | REQUIRES TEST |
| Carrito invitado | Sí | Sí | Sí | Parcial | No | No | No | Parcial |
| Carrito autenticado/fusión | No | No | No | NOT VERIFIED | No | No | No | No |
| Checkout estándar | Sí | Sí | Parcial | Parcial | Sí | Sí | Parcial | No |
| COD | Sí | Sí | Parcial | Parcial | Sí | Sí | Parcial | Parcial |
| Culqi | Sí | Sí | Sí unitario | Parcial | Sí | Parcial | Parcial | No |
| Mercado Pago | Sí | Sí | Parcial | Parcial | Sí | Parcial | Parcial | No |
| PayPal | Sí | Sí | Sí unitario | Parcial | Sí | Parcial | Parcial | No |
| Yape/Plin | Sí | Sí | Sí unitario | No | No ante replay | Sí al aprobar | Sí | No |
| Preparación | Parcial | Sí | No | Parcial | No | No | Parcial | No |
| Envío/entrega | Parcial | Sí | No | No por ruta heredada | No | No | Parcial | No |
| Cancelación | Sí | Sí | Parcial | No por ruta heredada | Parcial | Parcial | Parcial | No |
| Reembolso total | Parcial | Parcial | Parcial | No multi-pasarela | Sí efectos | Sí efectos | Parcial | No |
| Devolución/cambio | No | No | No | No | No | No | No | No |
| Email | Sí | Sí | No | Parcial | Parcial | No | Parcial | No |
| Auditoría admin | Parcial | Parcial | Parcial | Parcial | N/A | No | Sí | No |

## 26. Matriz de seguridad

| Área | Estado | Evidencia y dictamen |
|---|---|---|
| Autenticación | Parcial | Clerk clientes; admin bcrypt/sesión revocable, sin MFA |
| Autorización | Parcial | RBAC presente; media y reclamos usan solo auth |
| Protección de APIs | Parcial | Zod frecuente; endpoint heredado omite reglas de negocio |
| Protección de datos | Parcial | Cookies seguras y redacción; retención/exportación no verificadas |
| Pagos | No aprobado | Pasarelas mejoradas; replay de pago manual y refunds abiertos |
| Webhooks | Parcial | Firma/API del proveedor; sin inbox/DLQ |
| Archivos | Parcial | Magic bytes/SVG/tamaño; blobs de comprobante públicos |
| Base de datos | Parcial | FK, Decimal e índices; faltan CHECK y dominios financieros |
| Frontend | Parcial | No decide totales; E2E incompletos |
| Infraestructura | NOT VERIFIED | Vercel/Neon/Redis; restore y probes no demostrados |
| Dependencias | No aprobado | 5 alertas de producción |
| Logs | Parcial | Pino/request ID/Sentry; console y auditoría no universal |

## 27. Roadmap recomendado

### Fase 0: riesgos críticos inmediatos

1. Hacer atómico e irreversible el ciclo de `PendingPayment`; impedir uploads
   tras `verified/rejected` y probar replay.
2. Retirar `/api/admin/orders/update-status` o delegarlo en el mismo servicio de
   estados que usa el admin moderno.
3. Añadir alertas y cola de conciliación para `VERIFYING` y cobros huérfanos.
4. Bloquear refund interno hasta confirmar dinero o registrar
   `REFUND_PENDING/FAILED`.

### Fase 1: integridad comercial

1. Máquina de estados única con optimistic lock.
2. `Payment`, `Transaction`, `Refund`, `Shipment` y `ShipmentItem`.
3. Snapshot completo de SKU/opciones.
4. CHECK constraints comerciales.
5. Soft delete sin cascada del ledger.
6. Reconciliadores de pagos e inventario.

### Fase 2: seguridad

1. MFA administrativo.
2. Rate limiting resiliente.
3. Permisos específicos para media y configuración legal.
4. Hash de tokens de sesión.
5. Retirar rutas diagnósticas.
6. Revisar blobs públicos, PII, CSRF y retención.
7. Monitorear y mitigar dependencias vulnerables.

### Fase 3: procesos faltantes

1. Devolución, recepción, inspección y restock.
2. Reembolso parcial y cambios.
3. Fulfillment parcial/múltiple.
4. Inventario por ubicación.
5. Carrito autenticado y fusión.
6. Gift cards/crédito si son requisito comercial.

### Fase 4: pruebas

1. PostgreSQL aislado para integración.
2. E2E en CI.
3. Sandboxes de todas las pasarelas.
4. Pruebas de concurrencia y replay.
5. Matriz negativa de permisos.
6. Chaos/fallos de Redis, DB, correo, SUNAT y proveedores.
7. Cobertura con umbral para módulos comerciales.

### Fase 5: rendimiento y escalabilidad

1. Outbox/inbox y workers.
2. Retries con backoff, DLQ y circuit breakers.
3. Pruebas de carga y pool de conexiones.
4. Paginación consistente y revisión de queries.
5. Métricas del cron, checkout, pagos e inventario.

### Fase 6: preparación para producción

1. Staging equivalente a producción.
2. Confirmar migraciones y cron con alertas.
3. Health/readiness/liveness.
4. Backup y restore probado con RPO/RTO.
5. Runbooks de cobro huérfano, `VERIFYING`, refund fallido y stock.
6. Rotación de secretos y revisión de accesos.
7. Rollback de aplicación y migración.

## 28. Dictamen final

**“No apto para producción”.**

El sistema avanzó de forma real: las reservas ya vencen, las pasarelas usan
claims atómicos y el inventario central tiene mejores garantías. Esas
correcciones están verificadas en el código y por pruebas unitarias.

El dictamen continúa siendo negativo porque persisten dos caminos ejecutables
que rompen la integridad comercial —replay de comprobantes manuales y endpoint
heredado de estados—, y porque devoluciones, refunds multi-pasarela,
fulfillment por cantidades y operación resiliente siguen incompletos.

### Evidencia de comandos

```text
npm test
Test Files  23 passed (23)
Tests       245 passed (245)

npx tsc --noEmit
Sin errores

npm run lint
0 errores; 3 warnings

npm run build
Exit 0; build generado
Advertencia: consultas Prisma fallaron por TLS local y varios fallbacks
permitieron continuar

npx playwright test --reporter=line
Timeout a 180 s; no aprobado ni reprobado funcionalmente
Causa observada: PostgreSQL/Neon inaccesible por TLS en este entorno

npm audit --omit=dev --json
Critical 0 | High 3 | Moderate 2 | Total 5
```

### Estado Git

Antes de actualizar este informe:

```text
(sin salida: working tree limpio)
```

Después de actualizarlo, el único cambio esperado es:

```text
 M auditoriados.md
```

### Declaración de cambios

No se modificó código fuente, configuración, dependencias, migraciones ni base
de datos. No se instaló ni actualizó ningún paquete y no se creó ningún commit.
Los comandos de build/E2E solo generaron artefactos ignorados por Git. El único
archivo versionado modificado durante esta auditoría fue `auditoriados.md`, tal
como solicitó el usuario.
