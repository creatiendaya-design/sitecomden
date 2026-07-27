# Auditoría integral de arquitectura, seguridad y procesos eCommerce

**Proyecto:** shopgood-pe  
**Fecha de auditoría:** 2026-07-27  
**Rama:** `master`  
**Commit base:** `f2974de`  
**Objeto auditado:** estado actual del working tree, incluyendo cambios locales no confirmados  
**Modalidad:** revisión estática, comandos de diagnóstico y pruebas unitarias no destructivas

> **Nota de alcance:** esta segunda auditoría incluye correcciones locales todavía no
> confirmadas en Git, especialmente `lib/payments/order-payment-state.ts`,
> `lib/paypal/confirm-payment.ts` y `lib/mercadopago/confirm-payment.ts`. Por tanto,
> que una corrección aparezca como presente en este informe no demuestra que esté
> desplegada en producción.

> **Revisión posterior (2026-07-27, misma fecha):** se verificó el informe contra
> el código y se corrigieron cinco hallazgos. Ver
> [§29 Correcciones aplicadas tras la auditoría](#29-correcciones-aplicadas-tras-la-auditoría).
> Siguen sin confirmar en Git, con la misma salvedad del párrafo anterior.

> **Nota sobre las prioridades P0:** la lista original mezcla en un mismo nivel
> trabajo de minutos (cablear Culqi a un helper que ya existía y ya estaba
> probado) con proyectos de días (reserva con expiración, dominio de
> devoluciones, ledger normalizado de pagos). Eso hace el roadmap inaccionable.
> En §29 se separan por esfuerzo real.

## 1. Resumen ejecutivo

El sistema tiene una base técnica considerablemente más madura que un prototipo.
Recalcula precios y tarifas en servidor, valida la relación producto-variante,
persiste importes como `Decimal`, crea pedidos dentro de transacciones, descuenta
inventario mediante operaciones atómicas y aplica idempotencia en varios flujos.

La revisión actual también comprobó mejoras recientes:

- PayPal compara moneda y monto capturado contra el total esperado.
- Mercado Pago y PayPal usan un claim atómico compartido para no convertir en
  pagada una orden cancelada o reembolsada.
- Los pagos tardíos sobre órdenes no pagables quedan registrados para
  reconciliación manual.
- PayPal `VOIDED` y Mercado Pago `cancelled` cancelan la orden y liberan stock
  transaccionalmente.
- Existen pruebas específicas de las nuevas transiciones de pago.
- Las pruebas unitarias actuales pasan: **21 archivos, 224 pruebas**
  (eran 20/211 antes de las correcciones de §29).

No obstante, el sistema todavía no debe operar como tienda real sin supervisión.
Los principales bloqueadores son (~~tachados~~ los resueltos en §29):

1. ~~Las órdenes de pasarela reservan inventario sin vencimiento.~~
   **Corregido:** `reservationExpiresAt` + barrido horario que cancela y libera.
2. ~~Culqi aún no usa el nuevo control `claimOrderAsPaid`.~~ **Corregido:** los
   dos caminos de Culqi (server action y webhook) pasan por el claim.
3. ~~Una orden pagada puede pasar a `CANCELLED` sin reembolsar.~~ **Corregido:**
   la transición se rechaza y la UI ofrece "Reembolsar" en su lugar.
4. Solo Mercado Pago tiene reembolso monetario automático desde el admin.
   Culqi, PayPal, Yape, Plin y COD pueden quedar marcados internamente como
   reembolsados aunque la devolución monetaria sea manual.
5. No existe dominio funcional para devoluciones, cambios, reembolsos parciales,
   envíos parciales ni inventario por ubicación.
6. ~~Los ajustes manuales de inventario no son transaccionales.~~ **Corregido:**
   `setStockAbsolute` hace movimiento + escritura en una transacción con
   compare-and-swap y reintento.
7. El rate limiting falla abierto ante ausencia o caída de Redis.
8. `npm audit --omit=dev` reporta 5 vulnerabilidades de producción (3 altas y 2
   moderadas), pero **ninguna tiene arreglo disponible**: son transitivas de
   `next`. No es tarea pendiente sino riesgo aceptado — ver la corrección al
   final de §29.

## 2. Veredicto general

**No preparado.**

Estado aparente: **beta funcional avanzada**. Podría convertirse en un MVP
controlado después de resolver los riesgos P0 de pagos, reservas e inventario.

## 3. Nivel de confianza

**Medio.**

La confianza es alta sobre la evidencia del código actual y las pruebas unitarias.
Es media para el sistema completo porque no se verificaron:

- Base de datos de producción ni datos existentes.
- Configuración real de Culqi, Mercado Pago, PayPal, Clerk, Resend o SUNAT.
- Recepción de webhooks a través del dominio público.
- E2E reales con dinero o sandbox de proveedores.
- Backups, restauración, alertas y configuración operativa de Vercel/Redis.
- Protección de ramas y variables en la plataforma remota.

## 4. Arquitectura identificada

- **Frontend y backend:** Next.js 16.2.12, React 19.2.3 y TypeScript.
- **Estilo arquitectónico:** monolito modular con App Router, Server Components,
  Server Actions y Route Handlers.
- **Persistencia:** Prisma 6.19.1 y PostgreSQL.
- **Autenticación clientes:** Clerk.
- **Autenticación administración:** bcrypt + token opaco en cookie HttpOnly +
  sesiones en PostgreSQL.
- **Autorización:** RBAC con roles, permisos por rol y excepciones por usuario.
- **Pagos:** Culqi, Mercado Pago, PayPal, Yape, Plin y COD.
- **Archivos:** Vercel Blob; Cloudflare Stream contemplado para video.
- **Correo:** Resend y React Email.
- **Rate limiting:** Upstash Redis.
- **Observabilidad:** Pino, request ID, Sentry y tabla `AuditLog`.
- **Facturación:** integración SUNAT.
- **Despliegue:** Vercel; `vercel.json` ejecuta `prisma migrate deploy && next build`.
- **CI:** GitHub Actions ejecuta lint, pruebas y build.
- **Colas/workers/outbox:** ausentes.
- **Multiempresa:** ausente; no hay `tenantId` ni aislamiento por tienda.

### Adecuación por escenario

| Escenario | Evaluación |
|---|---|
| MVP controlado | Parcialmente adecuado tras resolver P0 |
| Tienda mediana | No adecuado actualmente |
| Marketplace | No adecuado |
| SaaS multiempresa | No adecuado |
| Alta concurrencia | No adecuado actualmente |

El monolito modular es una elección razonable. No se recomienda migrar a
microservicios antes de estabilizar consistencia, estados, reservas y operación.

## 5. Mapa de módulos y responsabilidades

| Módulo | Responsabilidad | Evidencia |
|---|---|---|
| `app/(shop)` | Storefront, catálogo, cuenta, carrito y políticas | Rutas de tienda |
| `app/(checkout)` | Checkout, pago, retorno y confirmación | Rutas de compra |
| `app/admin` | Operación administrativa | Productos, pedidos, pagos, inventario y contenido |
| `app/api` | APIs públicas, administrativas y webhooks | Route Handlers |
| `actions/orders.ts` | Checkout estándar y estados de pedido | Acción principal de pedidos |
| `actions/cod-orders.ts` | Checkout contra entrega | Pedido COD transaccional |
| `actions/payments.ts` | Cobro con tarjeta Culqi | Cargo y confirmación |
| `lib/payments` | Estados compartidos y pago manual | Claims, conciliación y aprobación |
| `lib/inventory` | Descuento, liberación y restauración | Ledger de movimientos |
| `lib/mercadopago` | Preferencia, confirmación y refund | Integración Mercado Pago |
| `lib/paypal` | Creación, captura y confirmación | Integración PayPal |
| `prisma/schema.prisma` | Modelo de datos | PostgreSQL/Prisma |
| `lib/auth.ts` | Sesión y permisos admin | RBAC |
| `lib/rate-limit.ts` | Límites de login/API/formularios | Upstash |
| `lib/email.ts`, `emails/` | Correos transaccionales | Resend |
| `lib/audit-log.ts` | Auditoría administrativa | `AuditLog` |

## 6. Flujo actual del proceso eCommerce

```text
Catálogo PostgreSQL
  -> carrito Zustand/localStorage
  -> checkout público
  -> recálculo autoritativo en servidor
  -> Order + OrderItems
  -> descuento/reserva de stock
  -> pago externo o verificación manual
  -> retorno/webhook
  -> confirmación PAID
  -> preparación/envío/entrega manual
  -> reembolso total limitado
```

### Rastreo de los 20 flujos obligatorios

| Flujo | Entrada y archivos | Transacción/autorización | Resultado y partes faltantes |
|---|---|---|---|
| Crear producto | `POST app/api/admin/products/create/route.ts` | `products:create`; transacción | Completo, pero puede crear producto con variantes sin variante vendible |
| Crear variantes | Mismo endpoint | Misma transacción | SKU único; combinaciones no tienen restricción única |
| Asignar inventario | `actions/inventory.ts` | Permiso de inventario | El ajuste manual no es transaccional |
| Agregar al carrito | `store/cart.ts` | Cliente; sin BD | Persistencia local; sin fusión invitado-cuenta |
| Crear checkout | `CheckoutPageClient` -> `createOrder` | Público + rate limit | Revalidación servidor |
| Calcular total | `actions/orders.ts:185-418` | Servidor | Precio, promociones y envío autoritativos |
| Crear pedido | `actions/orders.ts:546-708` | Transacción | Idempotente si llega `idempotencyKey` |
| Iniciar pago | `actions/payment-redirect.ts` | `viewToken`/cookie | Monto desde Order; intento de pago no normalizado |
| Recibir webhook | Rutas Culqi/MP/PayPal | Firma o consulta al proveedor | Persistencia/reintento de evento incompletos |
| Confirmar pago | `actions/payments.ts`, confirmadores MP/PayPal | Claims parciales | MP/PayPal mejorados; Culqi aún divergente |
| Descontar inventario | `lib/inventory/decrement-stock.ts` | Dentro de tx | Atómico con guarda de stock |
| Preparar pedido | Cambio administrativo | `orders:update_status` | Sin tarea de almacén ni cantidades |
| Enviar pedido | Admin `mark-shipped` | `orders:update` | Un único tracking; sin envío parcial |
| Marcar entrega | `updateOrderStatus` | Permiso | Exige pago; sin webhook de transportista |
| Cancelar pedido | `actions/orders.ts:1163-1193` | Transacción | Libera stock; permite cancelar pagado |
| Reembolsar | `actions/refunds.ts` | `orders:refund` | Total; dinero automático solo MP |
| Devolver producto | No existe | No aplica | Ausente |
| Restaurar inventario | `restore-stock.ts` / `release-order-stock.ts` | Transacción | Total; sin inspección ni parcialidad comercial |
| Notificar cliente | `lib/email.ts` | Best-effort | Sin cola, outbox ni reintento persistente |
| Auditar admin | `lib/audit-log.ts` | Parcial | No todas las mutaciones llaman al auditor |

## 7. Procesos completos

- Recalculo del precio en servidor.
- Validación de pertenencia producto-variante.
- Cálculo servidor de tarifa de envío.
- Validación de cupones y promociones en servidor.
- Creación transaccional de pedido e ítems.
- Idempotencia de checkout cuando se proporciona la clave.
- Descuento atómico de stock con `stock >= quantity`.
- Aprobación/rechazo idempotente de Yape/Plin.
- Confirmación Mercado Pago con consulta al proveedor, monto y moneda.
- Confirmación PayPal actual con monto, moneda y claim atómico.
- Acceso público al pedido mediante secreto `viewToken`.
- Autenticación administrativa con bcrypt coste 12.
- RBAC en la mayoría de rutas administrativas.
- Validación de archivos por tamaño, extensión y magic bytes.
- Sanitización de SVG administrativo.
- CSP, HSTS, `nosniff`, protección de framing y request IDs.

## 8. Procesos incompletos

- Reserva y expiración de inventario.
- Conciliación automática de pagos huérfanos.
- Máquina de estados única para Culqi, MP, PayPal, pagos manuales y admin.
- Reembolso monetario automático multi-pasarela.
- Snapshot histórico completo de SKU/opciones.
- Carrito autenticado y fusión de carritos.
- Inventario reservado/comprometido/dañado/en tránsito.
- Envíos múltiples o parciales.
- Auditoría de todas las acciones administrativas.
- Correos con entrega garantizada.
- Backorders y gift cards.
- Impuestos calculados en checkout.
- Exportación y eliminación de datos de clientes.
- Health/readiness/liveness y runbooks.
- Backups y restauración demostrada.

## 9. Procesos ausentes

- Entidades `Return` y `ReturnItem`.
- Cambios de producto.
- Inspección y recepción de devolución.
- Reembolsos parciales.
- Contracargos.
- Pago parcial.
- Inventario por ubicación.
- Productos digitales y entrega digital.
- Múltiples monedas por pedido.
- Marketplace, vendedor y comisión.
- Multiempresa/multitienda.
- MFA administrativo.
- Cola, outbox y dead-letter queue.
- Reserva con `expiresAt`.
- Ledger normalizado de transacciones de pago y refund.

## 10. Bloqueadores para producción

1. Reservas de stock sin vencimiento.
2. Culqi puede confirmar pago tardío sobre orden cancelada.
3. Cancelación de orden pagada sin refund obligatorio.
4. Reembolso externo no garantizado salvo Mercado Pago.
5. Ausencia total de devoluciones y refunds parciales.
6. Ajustes manuales de inventario no transaccionales.
7. Webhooks sin inbox persistente/reintento controlado.
8. Rate limiting fail-open.
9. Dependencias productivas con vulnerabilidades altas.
10. Ausencia de E2E de pagos, concurrencia y webhooks reales.

## 11. Vulnerabilidades críticas

### C-01 - Reserva indefinida y agotamiento lógico de stock

`actions/orders.ts:523-686` descuenta/reserva stock al crear órdenes CARD,
MERCADOPAGO y PAYPAL. No existe `reservationExpiresAt`, cron de expiración ni
liberación automática de órdenes abandonadas/rechazadas.

**Explotación:** un atacante crea órdenes sin pagar hasta inmovilizar el
inventario. El límite de 10 checkouts por IP puede evadirse con IPs distribuidas
y además falla abierto si Redis no está disponible.

**Impacto:** pérdida de ventas, stock aparentemente agotado y operación manual.

### C-02 - Culqi puede revivir una orden cancelada

`app/api/culqi/webhook/route.ts:108-158` solo comprueba si ya está pagada y luego
ejecuta `order.update` sin excluir `CANCELLED`/`REFUNDED`. `actions/payments.ts`
también finaliza con un `order.update` incondicional después de cobrar.

**Explotación/escenario:** un administrador cancela mientras Culqi está
procesando; la cancelación libera stock; el cargo termina y Culqi vuelve a
marcar la orden `PAID` sin re-reservar unidades.

**Impacto:** pedido pagado y potencialmente enviado sin inventario respaldándolo.

## 12. Vulnerabilidades altas

- Cancelar `PAID -> CANCELLED` no procesa ni exige refund.
- Refund interno sin devolución automática para Culqi/PayPal/Yape/Plin/COD.
- Ajuste de inventario con lectura y escrituras separadas.
- Rate limiting permite peticiones cuando Redis falla.
- Webhooks MP/PayPal responden 200 aun cuando el confirmador devuelve error.
- Dependencias `postcss`/`sharp` reportadas con severidad alta.
- Fulfillment se actualiza como enum sin cantidades ni entidad de envío.
- `Order.version` no participa en `updateOrderStatus`.

## 13. Vulnerabilidades medias

- Upload administrativo exige autenticación, pero no `media:create`.
- Creación de campos de reclamaciones exige solo autenticación.
- Tokens de sesión admin se almacenan recuperables en PostgreSQL.
- `variantOptions` del pedido puede provenir del payload cliente.
- Restricciones estándar de envío solo validan distrito.
- Producto puede quedar activo con `hasVariants=true` y cero variantes.
- Sin constraints SQL para cantidad, total, descuento o stock.
- Hard delete de productos sin stock contradice el modelo soft-delete.
- Correos carecen de outbox e idempotencia de entrega.

## 14. Vulnerabilidades bajas

- Páginas diagnósticas continúan en el árbol desplegable.
- Algunos errores administrativos devuelven `error.message`.
- No se verificó limpieza automática de sesiones expiradas.
- No existe evidencia versionada de política de retención de logs.

## 15. Riesgos de integridad de datos

- Divergencia `Order.status`, `paymentStatus` y `fulfillmentStatus`.
- Carrera entre cancelación y confirmación Culqi.
- Movimiento de inventario creado sin cambio de stock, o viceversa, durante
  `adjustStock`.
- `Order.version` documenta optimistic locking pero no protege todos los cambios.
- Falta de checks de base para montos y cantidades no negativas.
- Snapshot de opciones parcialmente confiado al cliente.
- Hard delete puede eliminar movimientos asociados por cascada.
- No hay transacción financiera normalizada para reconciliar proveedor y orden.

## 16. Riesgos de pérdida de dinero

- Cancelación de pedido pagado sin devolver dinero.
- Refund interno distinto al refund real de la pasarela.
- Pago Culqi huérfano por carrera con cancelación.
- Webhook fallido aceptado con HTTP 200.
- Ausencia de conciliación automática y alertas de órdenes `VERIFYING`.
- Reembolso parcial de MP se ignora y requiere intervención manual.

## 17. Riesgos de pérdida de inventario

- Reservas abandonadas sin vencimiento.
- Carrera Culqi/cancelación.
- Rechazos reintentables conservan stock indefinidamente.
- Dos administradores pueden sobrescribir ajustes.
- No hay inventario por ubicación ni reconciliación programada.
- No existe modelado de daño, inspección o tránsito más allá de un tipo de movimiento.

## 18. Riesgos de privacidad

- Datos de DNI, teléfono, email y dirección carecen de retención documentada.
- Sesiones administrativas están en texto recuperable en BD.
- No se verificó exportación/borrado de datos del cliente.
- Rutas diagnósticas permanecen compilables.
- No se verificó redacción sistemática de PII en todos los logs/Sentry.

## 19. Riesgos operativos

- Email, SUNAT y tracking son efectos síncronos best-effort.
- No hay cola, reintento persistente ni DLQ.
- Rate limiter fail-open.
- Sin health/readiness/liveness real.
- Sin evidencia de backup restaurado.
- Migraciones se ejecutan como parte del build de Vercel.
- Pagos huérfanos se anotan, pero no generan tarea/alerta garantizada.

## 20. Problemas de rendimiento

- Confirmación de pago puede ejecutar lealtad, SUNAT y correo en la misma petición.
- Búsquedas `contains` administrativas pueden degradarse con grandes volúmenes.
- No se verificó pool de Prisma/Neon.
- No existen pruebas de carga ni perfiles de consultas.
- El contenido JSON de personalizaciones puede aumentar el tamaño de OrderItem.
- La arquitectura carece de worker para exportaciones, imágenes o notificaciones.

## 21. Problemas de escalabilidad

- Carrito local no se comparte entre dispositivos.
- No hay colas para absorber picos.
- No existe aislamiento por tenant.
- Todos los dominios comparten despliegue y base.
- No hay circuit breakers ni política uniforme de timeout/retry.
- Las reservas sin vencimiento empeoran con tráfico y abuso.

## 22. Problemas de mantenibilidad

- `actions/orders.ts` supera 1.300 líneas y combina checkout, promociones, stock,
  cliente, email, tracking y estados.
- Las transiciones de pago aún están repartidas; el helper nuevo solo cubre MP/PayPal.
- Existen dos sistemas de autenticación.
- Configuraciones críticas se almacenan como JSON.
- Los cambios locales auditados no están confirmados en Git.
- Hay páginas y scripts diagnósticos en el mismo árbol del producto.

## 23. Pruebas faltantes

### Resultado ejecutado

```text
Test Files  20 passed (20)
Tests       211 passed (211)
```

### Cobertura crítica faltante

- Culqi aprobado después de cancelar.
- Carrera `processCardPayment` vs cancelación.
- Expiración y abandono de reserva.
- Webhook fuera de orden en las tres pasarelas.
- Reembolso externo real Culqi/PayPal.
- Reembolso y devolución parcial.
- Carrera entre dos administradores de inventario.
- Envíos parciales y validación de cantidades.
- Autorización negativa para cada rol.
- Redis, correo, SUNAT, proveedor y DB indisponibles.
- Restauración desde backup.
- E2E de pasarelas sandbox.
- Cobertura cuantificada; no se generó reporte de coverage para no crear artefactos.

## 24. Tabla de hallazgos

| ID | Categoría | Severidad | Estado | Archivo/línea | Evidencia y escenario | Impacto | Prob. | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|
| F-01 | Inventario | Critical | **CORREGIDO** | `actions/orders.ts`, `lib/inventory/reservation-policy.ts`, `lib/inventory/release-expired-reservations.ts` | Reserva al crear; no había vencimiento | Stock bloqueado/DoS comercial | Alta | Reserva explícita con `expiresAt` y job idempotente | Alto | P0 |
| F-02 | Culqi | Critical | **CORREGIDO** | `app/api/culqi/webhook/route.ts` | Update pagado no excluía orden cancelada | Venta sin stock | Media | Usar `claimOrderAsPaid` y registrar pago huérfano | Medio | P0 |
| F-03 | Culqi | Critical | **CORREGIDO** | `actions/payments.ts` | Cancelación concurrente durante cargo podía ser sobrescrita | Dinero/stock inconsistentes | Media | Claim final condicionado y reconciliación | Medio | P0 |
| F-04 | Pedidos | High | **CORREGIDO** | `actions/orders.ts` | Permitía `PAID -> CANCELLED` | Stock vuelve sin refund | Alta | Transición de cancelación pagada ligada a refund | Medio | P0 |
| F-05 | Reembolsos | High | CONFIRMED | `actions/refunds.ts:12-15` | Dinero automático solo MP | Falso estado reembolsado | Alta | `REFUND_PENDING` e integración por proveedor | Alto | P0 |
| F-06 | Webhooks | High | **MITIGADO** | rutas MP/PayPal | Error interno se confirmaba con HTTP 200 | Pago queda pendiente | Media | Hecho: 5xx en fallo reintentable. Pendiente: inbox de eventos | Medio | P0 |
| F-07 | Inventario | High | **CORREGIDO** | `actions/inventory.ts`, `lib/inventory/set-stock.ts` | Read/movement/update separados | Ledger y stock divergen | Alta | Tx + compare-and-swap | Medio | P0 |
| F-08 | Concurrencia | High | CONFIRMED | `schema.prisma:381-384`; `orders.ts:1053-1193` | `version` no usada | Estados perdidos | Media | Máquina de estados y optimistic lock | Alto | P0 |
| F-09 | Devoluciones | High | CONFIRMED | ausencia en `schema.prisma` | Sin Return/ReturnItem | Proceso postventa inviable | Alta | Dominio de devoluciones | Alto | P1 |
| F-10 | Supply chain | High | CONFIRMED | `npm audit --omit=dev` | 3 altas, 2 moderadas | XSS/lectura de archivos/libvips | Media | Evaluar actualización compatible | Medio | P0 |
| F-11 | Rate limit | High | CONFIRMED | `lib/rate-limit.ts:233-247` | Redis caído permite petición | Fuerza bruta/abuso | Media | Fail-closed selectivo o fallback | Medio | P1 |
| F-12 | Fulfillment | High | CONFIRMED | `actions/orders.ts:1147-1149` | Estado sin cantidades | Sobreenvío/inconsistencia | Media | Shipment/FulfillmentItem | Alto | P1 |
| F-13 | Carrito | Medium | CONFIRMED | `store/cart.ts:67-206`; schema `:679-704` | Modelo DB desconectado | Sin fusión/recuperación | Alta | Servicio de carrito o retirar modelo | Medio | P3 |
| F-14 | Catálogo | Medium | CONFIRMED | `validations.ts:156-158`; create `:144` | Variantes opcionales | Producto no vendible | Media | Requerir variante válida | Bajo | P1 |
| F-15 | Histórico | Medium | CONFIRMED | `actions/orders.ts:605` | Opciones desde cliente | Snapshot manipulable | Media | Tomar opciones/SKU de BD | Bajo | P1 |
| F-16 | Envío | Medium | CONFIRMED | `actions/orders.ts:462-466` | Solo valida distrito | Restricción incompleta | Media | Resolver IDs geográficos | Medio | P1 |
| F-17 | Base de datos | Medium | CONFIRMED | `schema.prisma:320-324,395-416` | Sin checks de monto/cantidad | Filas inválidas | Media | Constraints SQL | Medio | P1 |
| F-18 | Autorización | Medium | CONFIRMED | `app/api/upload/route.ts:56-59` | Solo `requireAuth` | Staff sube contenido | Media | `media:create` | Bajo | P2 |
| F-19 | Autorización | Medium | CONFIRMED | complaints fields `:30-32` | Solo autenticación | Alteración de formulario legal | Media | Permiso específico | Bajo | P2 |
| F-20 | Sesiones | Medium | CONFIRMED | `schema.prisma:857-866` | Token recuperable | Secuestro si se lee BD | Baja | Hash del token | Medio | P2 |
| F-21 | Catálogo | Medium | CONFIRMED | `actions/inventory.ts:489-514` | Hard delete por stock cero | Pérdida de ledger | Media | Soft delete | Bajo | P1 |
| F-22 | Email | Medium | CONFIRMED | `actions/orders.ts:1247-1334` | Best-effort sin outbox | Pérdida/duplicado | Alta | Outbox e idempotency key | Medio | P2 |
| F-23 | Pagos | Medium | CONFIRMED | `schema.prisma:357-360` | Solo campos + JSON | Conciliación limitada | Alta | Payment/Transaction/Refund | Alto | P1 |
| F-24 | Operación | Medium | NOT VERIFIED | infraestructura externa | Backup/restore no demostrado | Pérdida prolongada | Media | RPO/RTO y simulacro | Medio | P2 |
| F-25 | Debug | Low | CONFIRMED | `app/test-server-auth/page.tsx` | Ruta diagnóstica compilable | Exposición innecesaria | Media | Excluir en producción | Bajo | P3 |

### Hallazgos corregidos o mitigados desde la auditoría anterior

| ID anterior | Estado actual | Evidencia |
|---|---|---|
| Pago tardío MP/PayPal revive cancelada | Mitigado en working tree | `claimOrderAsPaid` excluye CANCELLED/REFUNDED |
| PayPal no valida monto | Corregido en working tree | `lib/paypal/confirm-payment.ts:106-126` |
| PayPal VOIDED no libera stock | Corregido en working tree | `cancelOrderForFailedPayment` |
| MP cancelled no libera stock | Corregido en working tree | `lib/mercadopago/confirm-payment.ts:217-243` |

## 25. Matriz de procesos eCommerce

| Proceso | Implementado | Integrado | Probado | Seguro | Idempotente | Transaccional | Observable | Producción |
|---|---|---|---|---|---|---|---|---|
| Producto | Sí | Sí | Parcial | Parcial | N/A | Sí | Parcial | Parcial |
| Variantes | Sí | Sí | Parcial | Parcial | N/A | Sí | Parcial | No |
| Carrito invitado | Sí | Parcial | Sí | Parcial | No | No | No | Parcial |
| Carrito autenticado/fusión | No | No | No | NOT VERIFIED | No | No | No | No |
| Checkout estándar | Sí | Sí | Parcial | Parcial | Sí | Sí | Parcial | No |
| COD | Sí | Sí | Parcial | Parcial | Sí | Sí | Parcial | Parcial |
| Inventario de venta | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Parcial |
| Reserva/expiración | No | No | No | No | No | No | No | No |
| Culqi | Sí | Sí | Parcial | No | Parcial | Parcial | Sí | No |
| Mercado Pago | Sí | Sí | Parcial | Parcial | Sí | Parcial | Sí | No |
| PayPal | Sí | Sí | Sí | Parcial | Sí | Parcial | Sí | Parcial |
| Pago manual | Sí | Sí | Sí | Parcial | Sí | Sí | Sí | Parcial |
| Preparación/envío | Parcial | Parcial | No | Parcial | No | No | Parcial | No |
| Entrega | Parcial | Sí | No | Parcial | No | No | Parcial | No |
| Cancelación | Sí | Sí | Parcial | No | Sí | Sí | Parcial | No |
| Reembolso total | Parcial | Parcial | Parcial | No | Sí | Sí | Parcial | No |
| Devolución/cambio | No | No | No | No | No | No | No | No |
| Email | Sí | Sí | No | Parcial | No | No | Parcial | No |
| Auditoría admin | Parcial | Parcial | Parcial | Parcial | N/A | No | Sí | No |

## 26. Matriz de seguridad

| Área | Estado | Evaluación |
|---|---|---|
| Autenticación | Parcial | Clerk; admin bcrypt/sesión propia sin MFA |
| Autorización | Parcial | RBAC amplio con endpoints de solo autenticación |
| APIs | Parcial | Zod y rate limit frecuentes, no uniformes |
| Datos | Parcial | Decimal/FK; faltan checks y retención |
| Pagos | No aprobado | Culqi y refunds siguen bloqueando |
| Webhooks | No aprobado | Buena verificación, mala entrega/retry |
| Archivos | Parcial | Buen contenido/tamaño; permisos insuficientes |
| Base de datos | Parcial | Buenos índices/FK; integridad comercial incompleta |
| Frontend | Parcial | No decide precios; carrito local manipulable pero revalidado |
| Infraestructura | NOT VERIFIED | Vercel/Upstash indicados; backup no probado |
| Dependencias | No aprobado | 3 altas y 2 moderadas |
| Logs | Parcial | Pino/request ID/Sentry; auditoría incompleta |

## 27. Roadmap recomendado

### Fase 0: riesgos críticos inmediatos

1. Crear reserva explícita con vencimiento y job de liberación.
2. Integrar Culqi y `processCardPayment` con `claimOrderAsPaid`.
3. Impedir cancelación pagada sin workflow de refund.
4. Modelar `REFUND_PENDING`, `REFUND_FAILED` y conciliación.
5. Resolver o aislar dependencias vulnerables.
6. Añadir alertas para cobros huérfanos y órdenes `VERIFYING`.

### Fase 1: integridad comercial

1. Máquina de estados única para orden/pago/fulfillment.
2. Usar `version` en pedidos e inventario.
3. Normalizar Payment, Transaction, Refund y Shipment.
4. Agregar constraints SQL.
5. Snapshot autoritativo completo.
6. Reconciliación de inventario y pagos.

### Fase 2: seguridad

1. MFA administrativo.
2. Permisos específicos para media, formularios y configuración.
3. Rate limiting resiliente.
4. Hash de tokens de sesión.
5. Retirar rutas diagnósticas.
6. Revisión de secretos y PII en logs.

### Fase 3: procesos faltantes

1. Return/ReturnItem, recepción, inspección y restock.
2. Reembolsos y devoluciones parciales.
3. Fulfillment parcial y múltiple.
4. Inventario por ubicación.
5. Carrito autenticado y fusión.

### Fase 4: pruebas

1. Integración contra PostgreSQL real.
2. E2E de checkout y sandbox de pasarelas.
3. Pruebas de concurrencia.
4. Matriz de autorización negativa.
5. Fallos de Redis/correo/SUNAT/DB/proveedor.
6. Cobertura y pruebas de seguridad.

### Fase 5: rendimiento y escalabilidad

1. Outbox y workers.
2. Colas con DLQ.
3. Timeouts, retries y circuit breakers.
4. Pruebas de carga.
5. Revisión de pool y queries.

### Fase 6: preparación para producción

1. Dashboards, alertas y runbooks.
2. Health/readiness/liveness.
3. Backup y simulacro de restauración.
4. Rotación de secretos.
5. Staging con proveedores sandbox.
6. Rollback de despliegue y migraciones.

## 28. Dictamen final

**“No apto para producción”.**

La arquitectura base es válida para evolucionar hacia una tienda real y no
necesita microservicios. Los impedimentos actuales son de integridad comercial:
reserva de inventario, estados concurrentes, Culqi, cancelación/reembolso y
procesos postventa.

El working tree contiene mejoras importantes en Mercado Pago y PayPal, pero al
no estar confirmadas ni verificadas en un entorno desplegado se consideran
evidencia del código actual, no evidencia de producción.

## 29. Correcciones aplicadas tras la auditoría

Cinco hallazgos se verificaron contra el código y se corrigieron. Los tres
Critical/High restantes de la lista P0 (F-01, F-05, F-10) **no** se tocaron:
requieren cambios de esquema, integraciones por proveedor o decisiones sobre
dependencias, y se detallan en "Lo que sigue abierto".

### F-02 / F-03 — Culqi ya no puede revivir una orden cancelada

Culqi era la última pasarela con un `order.update` incondicional después de
cobrar. Ahora ambos caminos —`processCardPayment` y el webhook
`charge.succeeded`— pasan por `claimOrderAsPaid`, el mismo compare-and-swap que
ya usaban Mercado Pago y PayPal, que exige que la orden siga siendo pagable
(`status NOT IN (CANCELLED, REFUNDED)`).

Cuando el claim falla porque la orden ya no admite pago, el cobro se registra
con `recordOrphanPayment` (log de error + nota en el pedido, idempotente) y el
cliente recibe un mensaje honesto en vez de una confirmación falsa.

Efecto lateral que la auditoría no había listado y que quedó cerrado: el webhook
sólo ejecutaba lealtad. Si ganaba él la carrera —el caso típico, la petición de
la server action muere por red pero el cargo sí se creó— el cliente **nunca
recibía el correo de confirmación y no se emitía el comprobante SUNAT**. Ambos
caminos comparten ahora `runCulqiPostPaymentEffects`, y sólo los ejecuta quien
gana el claim, así que no se duplican.

Archivos: `actions/payments.ts`, `app/api/culqi/webhook/route.ts`,
`lib/payments/culqi-post-payment.ts` (nuevo).

### F-04 — Cancelar una orden pagada exige pasar por el reembolso

`updateOrderStatus` aceptaba `PAID -> CANCELLED`: devolvía el stock y cerraba el
pedido sin tocar el dinero, dejando al cliente sin producto y sin devolución, y
la orden marcada `CANCELLED` (no `REFUNDED`), de modo que ni siquiera figuraba
como pendiente de devolver.

Ahora esa transición se rechaza cuando `paymentStatus === "PAID"`, y también se
rechaza escribir `paymentStatus = REFUNDED` a mano: ese estado lo escribe sólo
`applyRefund`, que además restaura inventario, revierte puntos y notifica.
`canCancelOrder` acepta el estado de pago para que la UI no ofrezca un botón que
siempre iba a fallar (donde desaparece "Cancelar" aparece "Reembolsar").

Archivos: `actions/orders.ts`, `lib/order-status-logic.ts`,
`app/admin/ordenes/[orderId]/MoreActionsMenu.tsx`.

### F-06 — Los webhooks dejan de confirmar lo que no procesaron (mitigación)

Ambos confirmadores distinguen ahora fallo **reintentable** de **terminal** con
un campo `retryable` en el resultado. Los route handlers devuelven 503 en el
primer caso, para que la pasarela reentregue el evento, y mantienen 200 en el
segundo, donde insistir sólo genera ruido.

- Reintentable: la API del proveedor no respondió, la BD falló al aplicar un
  reembolso, falta configurar el tipo de cambio de PayPal (con el dinero ya
  capturado).
- Terminal: importe que no cuadra, pago sin referencia de orden, orden
  inexistente.

**Esto es una mitigación, no el cierre del hallazgo.** El inbox persistente de
eventos con reintento controlado y DLQ sigue pendiente; ahora mismo la garantía
de reintento es la de la pasarela, no la nuestra.

Archivos: `lib/mercadopago/confirm-payment.ts`, `lib/paypal/confirm-payment.ts`,
`app/api/webhooks/mercadopago/route.ts`, `app/api/webhooks/paypal/route.ts`.

### F-07 — El ajuste manual de inventario es transaccional

El ajuste creaba el movimiento del ledger y escribía el stock en dos operaciones
sueltas, sin transacción y sobre una lectura previa. Dos admins ajustando a la
vez se pisaban, y un fallo entre ambas dejaba un movimiento que nadie aplicó.

La lógica vive ahora en `lib/inventory/set-stock.ts`: movimiento y escritura en
la misma transacción, con la escritura condicionada al stock leído
(`updateMany where { id, stock: previousStock }`). Si alguien lo movió en medio
—otro admin, o una venta que descontó unidades— el CAS no prospera y se
reintenta con el valor fresco, hasta 3 veces, de modo que la diferencia
registrada corresponde siempre al cambio real. Agotados los intentos devuelve un
error que el admin puede entender en lugar de escribir un valor incorrecto.

Archivos: `lib/inventory/set-stock.ts` (nuevo), `actions/inventory.ts`.

### F-01 — Reserva de inventario con vencimiento

El bloqueador #1, y no por el escenario de ataque que describía el informe sino
por uno mucho más frecuente: **cada checkout abandonado retenía stock para
siempre**. En ecommerce eso es la mayoría de los checkouts, así que la tienda se
quedaba "sin stock" sola, sin que nadie la atacara. Los rechazos reintentables
(tarjeta declinada en MercadoPago, donde el pedido se mantiene vivo a propósito
para que el cliente pruebe otro medio) tenían el mismo problema.

**Política elegida: al vencer, la orden se CANCELA y devuelve su stock.** La
alternativa —liberar stock dejando el pedido vivo— abría una ventana de
sobreventa: un pago tardío confirmaría un pedido sin unidades detrás. Con la
cancelación, ese pago tardío entra por el camino de cobro huérfano construido en
F-02/F-03: queda anotado en el pedido para reembolso manual.

Piezas:

- `Order.reservationExpiresAt` (nullable, indexada). `NULL` significa "no
  caduca", así que los pedidos históricos **no** se cancelan retroactivamente.
- `lib/inventory/reservation-policy.ts` — una sola fuente para quién reserva y
  por cuánto. Sólo `CARD` / `MERCADOPAGO` / `PAYPAL`: Yape y Plin no tocan
  inventario hasta que un admin aprueba el comprobante, y COD es un pedido
  comprometido, no un checkout a medias. Ventana de 60 min, ajustable con
  `ORDER_RESERVATION_MINUTES` y acotada contra valores absurdos.
- `lib/inventory/release-expired-reservations.ts` — barrido por lotes, una
  transacción por orden (un fallo aislado no aborta el lote), idempotente porque
  reutiliza `cancelOrderForFailedPayment` + el cálculo de retenido desde el
  ledger.
- `app/api/internal/release-expired-reservations` — mismo patrón `CRON_SECRET`
  fail-closed que `/api/internal/review-requests`.
- `.github/workflows/release-expired-reservations.yml` — horario, con la
  justificación de cadencia abajo.

**La exclusión que más importa:** el barrido **nunca toca `paymentStatus =
VERIFYING`**. Ese estado significa cobro en vuelo o pendiente de conciliación
manual — es donde `processCardPayment` deja a propósito las órdenes cuyo
resultado con Culqi fue indeterminado. Cancelarlas automáticamente convertiría
ese caso en un cobro sobre orden cancelada, justo lo que F-02/F-03 acaba de
cerrar. Sí barre `PENDING` y `FAILED`.

#### Por qué el cron es horario y no cada 10 minutos

No es pereza: `warmup.yml` documenta que un schedule `*/10` agotó la cuota de
Neon en plan gratuito el 2026-06-20 y **tumbó la tienda entera** (cada consulta
fallaba con el error de cuota). Cada pasada despierta la compute y Neon sigue
facturando ~5 min tras la última consulta. Una pasada por hora son ~24
despertares/día en lugar de 144.

El coste de esa cadencia es latencia, no correctitud: con ventana de 60 min, el
stock vuelve entre 1 y 2 horas después del abandono. Si la tienda pasa a un plan
de pago de Neon, bajar a `*/15` es seguro y está anotado en el propio workflow.

#### Pendiente de despliegue

La migración `20260727020000_order_reservation_expires_at` **no se ha aplicado a
ninguna base de datos**. Se aplica sola en el despliegue (`vercel.json` ejecuta
`prisma migrate deploy && next build`); en local requiere
`npx prisma migrate deploy`. Hasta entonces el código nuevo no puede correr
contra la BD actual.

Además, para que el barrido funcione en producción hacen falta dos ajustes en
GitHub: el secret `CRON_SECRET` (mismo valor que en Vercel) y la variable
`PRODUCTION_URL`. Sin `CRON_SECRET` el workflow **falla a propósito** en vez de
llamar sin autenticar — este job cancela pedidos.

### Verificación ejecutada

```text
npx vitest run
Test Files  23 passed (23)
Tests       245 passed (245)

npx tsc --noEmit      → sin errores
npm run lint          → 0 errores, 3 warnings preexistentes ajenos al cambio
npm run build         → build de producción completo; la nueva ruta
                        /api/internal/release-expired-reservations queda registrada
```

Pruebas nuevas: `lib/inventory/set-stock.test.ts` (9 casos: CAS, reintento con
valor fresco, ausencia de movimiento fantasma, precedencia de variante),
más casos añadidos en `app/api/culqi/webhook/route.test.ts` (no revivir orden
cancelada, no repetir efectos en carrera) y `lib/order-status-logic.test.ts`
(no cancelar lo ya cobrado).

### Lo que sigue abierto (y por qué no se tocó)

| ID | Por qué queda fuera de una corrección quirúrgica |
|---|---|
| F-05 Reembolso monetario multi-pasarela | Requiere integrar refund contra Culqi y PayPal y modelar `REFUND_PENDING` / `REFUND_FAILED`. Hoy el estado interno miente para todo lo que no es Mercado Pago. **Es el siguiente P0 real.** |
| F-06 (resto) Inbox de webhooks | Modelo de eventos persistido + worker de reintento + DLQ. La mitigación aplicada cubre el caso frecuente, no la garantía. |
| F-09 Devoluciones | Dominio nuevo (`Return`, `ReturnItem`, recepción, inspección, restock). |
| F-11 Rate limit fail-open | Cambiar a fail-closed sin fallback deja la tienda caída si Redis cae; el diseño correcto (fallback en memoria por instancia, o fail-closed sólo en login) es una decisión, no un parche. |
| F-12, F-23 Shipment / ledger de pagos | Modelos nuevos y migración de datos existentes. |

**Corrección al informe — F-10 no es accionable.** Se listó como P0 con esfuerzo
"Medio" y recomendación "evaluar actualización compatible". Verificado con
`npm audit --omit=dev`: las 5 vulnerabilidades reportan **`No fix available`** y
son todas transitivas de `next` (`postcss` y `sharp` viven bajo
`node_modules/next/node_modules/`). No hay versión que instalar. El commit
`79350c7` ya hizo ese trabajo: *"24 -> 5 (residual has no fix)"*. Queda como
riesgo aceptado y a la espera de un release de Next, no como tarea pendiente.

El **dictamen general no cambia**: sigue siendo "no apto para producción". Lo
que cambió es que los tres agujeros que podían perder dinero o vender sin stock
por una carrera —Culqi tardío, cancelación de orden pagada, ajuste de inventario
concurrente— están cerrados, y que un fallo transitorio de webhook ya no se
confirma como procesado.

## Evidencia de comandos

### Pruebas unitarias

```text
Test Files  21 passed (21)
Tests       224 passed (224)
```

### Dependencias de producción

```text
npm audit --omit=dev
Critical: 0
High: 3
Moderate: 2
Total: 5
```

### Estado Git observado antes de crear este informe

```text
 M actions/mercadopago-return.ts
 M app/(checkout)/orden/[orderId]/pago-paypal/retorno/page.tsx
 M lib/mercadopago/client.ts
 M lib/mercadopago/confirm-payment.ts
 M lib/paypal/confirm-payment.ts
?? auditoriados.md
?? lib/payments/order-payment-state.test.ts
?? lib/payments/order-payment-state.ts
?? lib/paypal/confirm-payment.test.ts
?? scripts/diagnose-mercadopago.ts
```

## Declaración de cambios

Durante esta segunda auditoría solo se escribió el archivo solicitado
`auditoriados.md`. No se modificó código fuente, configuración, migraciones,
dependencias ni base de datos; no se crearon commits.

**Revisión posterior (§29):** sí se modificó código fuente.

Ficheros nuevos: `lib/payments/culqi-post-payment.ts`,
`lib/inventory/set-stock.ts`, `lib/inventory/reservation-policy.ts`,
`lib/inventory/release-expired-reservations.ts`,
`app/api/internal/release-expired-reservations/route.ts`,
`.github/workflows/release-expired-reservations.yml`,
`prisma/migrations/20260727020000_order_reservation_expires_at/migration.sql`,
más sus ficheros de test.

Ficheros modificados: `prisma/schema.prisma`, `actions/payments.ts`,
`actions/orders.ts`, `actions/inventory.ts`, `app/api/culqi/webhook/route.ts`,
`app/api/webhooks/mercadopago/route.ts`, `app/api/webhooks/paypal/route.ts`,
`lib/mercadopago/confirm-payment.ts`, `lib/paypal/confirm-payment.ts`,
`lib/payments/order-payment-state.ts`, `lib/order-status-logic.ts`,
`app/admin/ordenes/[orderId]/MoreActionsMenu.tsx`, y sus tests.

Sí se añadió una migración de Prisma, pero **no se ejecutó contra ninguna base
de datos**. No se tocaron dependencias y no se crearon commits.
