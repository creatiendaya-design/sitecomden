# Auditoría avanzada de arquitectura, seguridad y procesos eCommerce

- **Proyecto:** `shopgood-pe`
- **Fecha de reevaluación:** 2026-07-29
- **Rama:** `master`
- **Commit auditado:** `4b7094f`
- **Auditoría de referencia:** commit `d5a6698`, 2026-07-27
- **Modalidad:** análisis estático, trazado de flujos, revisión diferencial y pruebas no destructivas
- **Alcance de escritura autorizado:** únicamente `auditoriados.md`

> Esta auditoría reemplaza la versión anterior. Los hallazgos previos se
> contrastaron otra vez con el código actual y se revisaron especialmente los
> cambios recientes del checkout y Mercado Pago. “Confirmado” describe el código
> revisado; no demuestra por sí solo que la misma versión, migraciones, variables
> y controles estén desplegados en producción.

## 1. Resumen ejecutivo

`shopgood-pe` es un monolito modular de Next.js con una base técnica razonable
para un MVP controlado. El checkout calcula nuevamente precios, descuentos,
envío y stock en servidor; la creación de órdenes tiene idempotencia; el
inventario usa decrementos atómicos y movimientos; y las confirmaciones de
Culqi, Mercado Pago y PayPal comparten una reclamación atómica que evita revivir
órdenes canceladas. Las mejoras recientes también envían a Mercado Pago datos
del comprador y hacen más directo el salto desde el checkout.

Esta auditoría identificó dos cadenas de pérdida de dinero e inventario. **Ambas
se remediaron en la iteración documentada en la sección 29**, junto con los otros
dos hallazgos P0. Resumen del estado tras esa remediación:

1. **Reaprobación de pagos manuales (ADV-01) — CERRADO.** El cliente ya no puede
   devolver a `pending` un comprobante verificado o rechazado, y las dos
   escrituras van en una transacción con compare-and-swap.
2. **Múltiples sesiones externas para una misma orden (ADV-02) — MITIGADO
   PARCIAL.** El segundo cobro ya no se descarta en silencio: se detecta
   comparando el id del pago con `Order.paymentId` y queda registrado como
   duplicado para reembolso. Lo que **sigue abierto** es la prevención: cada
   visita a una página puente continúa creando una preferencia/orden nueva, sin
   `PaymentAttempt` ni idempotency key del proveedor. Se puede seguir cobrando dos
   veces; la diferencia es que ahora se sabe y se puede devolver.
3. **Cobro sobre órdenes terminales (ADV-03) — CERRADO.** Un único predicado
   (`lib/payments/order-payable.ts`) gobierna los cuatro iniciadores.
4. **Ruta administrativa heredada (ADV-04) — CERRADO.** Retirada; era además
   código muerto.

Persisten como bloqueadores: reembolsos automáticos solo para Mercado Pago,
ausencia de devoluciones/fulfillment parcial, rate limiting fail-open, falta de
inbox de webhooks, conciliación insuficiente y MFA ausente.

**Resultados de verificación de esta ejecución:**

- Vitest: **23 archivos, 245/245 pruebas aprobadas** (tras la remediación de la
  sección 29: **26 archivos, 289/289**).
- TypeScript: **sin errores**.
- ESLint: **0 errores y 3 advertencias**.
- Build de producción: **completado**; durante el prerender hubo errores TLS de
  Prisma absorbidos por fallbacks.
- Playwright E2E: **no concluyó en 200 s**; la aplicación respondió 500 porque el
  entorno no pudo abrir TLS hacia PostgreSQL. No se considera aprobado ni
  reprobado funcionalmente.
- `npm audit --omit=dev`: **5 alertas de producción: 3 High y 2 Moderate**.

## 2. Veredicto general

**No preparado** (sin cambio tras la remediación de la sección 29).

Las cuatro rutas P0 originales están cerradas o, en el caso de ADV-02, acotadas a
un fallo detectable y reversible en vez de invisible. Eso mejora materialmente el
riesgo, pero no alcanza para declarar preparación: siguen abiertos el reembolso
monetario por proveedor (ADV-05), la ausencia de devoluciones y fulfillment por
cantidades (ADV-06/07), la conciliación de `VERIFYING` (ADV-08), el inbox de
webhooks (ADV-09), el rate limiting fail-open (ADV-10) y la falta de MFA (ADV-13).

## 3. Nivel de confianza

**Medio-alto para el código; medio para el sistema desplegado.**

La confianza es alta en los hallazgos confirmados por trazado directo y en las
245 pruebas unitarias. Baja a media para producción porque no se verificaron:

- migraciones y contenido real de PostgreSQL;
- variables, secrets, cron y URLs del despliegue;
- pagos, webhooks y reembolsos con cuentas sandbox;
- política de backups, restauración, RPO/RTO y rollback;
- alertas de conciliación y respuesta operativa;
- E2E completos debido al error TLS local.

## 4. Arquitectura identificada

| Capa | Implementación observada | Evaluación |
|---|---|---|
| Aplicación | Next.js 16.2.12, React 19.2.3, TypeScript, App Router | Adecuada como monolito modular |
| Persistencia | Prisma 6.19.1, PostgreSQL/Neon | Buena base; dominio transaccional incompleto |
| Cliente | Tailwind, Radix/shadcn, Zustand, React Hook Form | Funcional; lógica crítica permanece en servidor |
| Clientes | Clerk | Separado de administración |
| Administración | bcrypt, sesión opaca en BD, cookie HttpOnly, RBAC | Base correcta; sin MFA, token recuperable |
| Pagos | Culqi, Mercado Pago, PayPal, Yape, Plin, COD | Amplio; intentos y refunds no normalizados |
| Archivos | Vercel Blob y Cloudflare Stream | Validación útil; comprobantes públicos |
| Comunicación | Resend | Best-effort, sin outbox durable |
| Protección | Upstash rate limit, middleware, Zod | Rate limit fail-open |
| Observabilidad | Pino, request ID, Sentry opcional | Parcial; falta trazabilidad financiera durable |
| Despliegue | Vercel y GitHub Actions | CI sin E2E; build y runtime dependen de BD externa |

No se recomienda migrar a microservicios. Primero debe consolidarse una única
máquina de estados, un ledger financiero y procesos postventa dentro del
monolito. La arquitectura actual no es marketplace ni multiempresa: no existen
vendedores, comisiones, payouts o `tenantId`.

## 5. Mapa de módulos y responsabilidades

| Dominio auditado | Archivos/entidades principales | Estado |
|---|---|---|
| 1. Arquitectura | `app/**`, `actions/**`, `lib/**` | Modular, con implementaciones heredadas divergentes |
| 2. Catálogo | APIs admin, `Product`, `ProductVariant`, categorías | Amplio; invariantes de variante incompletas |
| 3. Inventario | `lib/inventory/**`, `InventoryMovement` | Atómico; sin almacenes ni stock dañado/en tránsito |
| 4. Carrito | `store/cart.ts`, `Cart`, `CartItem` | Carrito cliente; modelos DB desconectados |
| 5. Checkout | `actions/orders.ts`, `cod-orders.ts` | Recalcula servidor e idempotente |
| 6. Órdenes | actions y APIs admin | Dos rutas de transición no equivalentes |
| 7. Pagos | `actions/payments*`, `lib/{payments,mercadopago,paypal}` | Claim final fuerte; inicio y manual vulnerables |
| 8. Fulfillment | estados de orden y tracking | Sin cantidades, paquetes o despachos parciales |
| 9. Devoluciones/refunds | `actions/refunds.ts`, `apply-refund.ts` | Refund total parcial; devoluciones ausentes |
| 10. Clientes/cuentas | Clerk, `Customer`, cuenta/pedidos | Funcional; privacidad incompleta |
| 11. Admin/permisos | `lib/auth.ts`, sesiones, roles | RBAC; sin MFA ni auditoría universal |
| 12. Seguridad API | route handlers, Zod, rate limit | Cobertura desigual; fail-open |
| 13. Auth/tokens | Clerk, `viewToken`, sesión admin | Tokens útiles; sesión admin no hasheada |
| 14. Base/integridad | `prisma/schema.prisma`, migraciones | Índices útiles; faltan checks y entidades |
| 15. Archivos/imágenes | `/api/upload`, media, review uploads | Magic bytes en rutas críticas; ACL desigual |
| 16. Emails/notificaciones | `lib/email/**`, Resend | Sin outbox/reintento durable |
| 17. Observabilidad/ops | Pino, Sentry, workflows, cron | Sin health/DR/conciliación demostrados |
| 18. Rendimiento | RSC, cachés, queries | Sin perfil/carga; algunas lecturas amplias |
| 19. Escalabilidad | Vercel, Neon, Redis | No certificada para alta concurrencia |
| 20. Frontend | checkout, carrito, admin | UX mejorada; bloqueos cliente no son controles |
| 21. Dependencias | `package-lock.json`, npm audit | 5 alertas de producción |
| 22. Pruebas | Vitest, Playwright | Unitarias verdes; E2E fuera de CI/no ejecutables aquí |
| 23. Casos borde | reservas, retries, concurrencia | Varios tratados; pagos múltiples siguen abiertos |

## 6. Flujo actual del proceso eCommerce

```text
Catálogo → carrito local → checkout → recálculo autoritativo
→ orden + reserva/descuento de inventario
→ creación de sesión de proveedor o prueba manual
→ webhook/retorno/aprobación → claim de pago
→ lealtad + SUNAT + correo
→ preparación → envío → entrega
→ refund total; no existe devolución estructurada
```

### Trazabilidad de los 20 procesos obligatorios

| # | Proceso | Entrada y entidades | Controles/transacción | Resultado y brecha |
|---:|---|---|---|---|
| 1 | Crear producto | APIs admin; `Product` | permiso, Zod, tx | Puede quedar con variantes incompletas |
| 2 | Crear variantes | `ProductVariant/Option` | tx y SKU único | Combinaciones/invariantes parciales |
| 3 | Asignar inventario | `actions/inventory.ts` | permiso, CAS, ledger | Sin ubicaciones |
| 4 | Agregar al carrito | Zustand | límites cliente | Servidor revalida; sin fusión persistente |
| 5 | Crear checkout | `/checkout`, `createOrder` | Zod, rate limit, idempotencia | Falla seguro ante precio/stock |
| 6 | Calcular total | `actions/orders.ts` | BD autoritativa | PEN implícito; bien defendido |
| 7 | Crear pedido | `Order/OrderItem` | transacción y clave única | Snapshot sin SKU autoritativo |
| 8 | Iniciar pago | `startGatewayCheckout`, páginas puente | `viewToken`, monto desde orden | No idempotente; acepta terminales |
| 9 | Recibir webhook | Culqi/MP/PayPal routes | firma/consulta según proveedor | Sin inbox o DLQ |
| 10 | Confirmar pago | confirmadores, `claimOrderAsPaid` | CAS/tx | Segundo cobro de otra sesión se ignora |
| 11 | Descontar inventario | `decrementStockAtomic` | guarda `stock >= quantity` | Reaprobación manual lo repite |
| 12 | Preparar pedido | Server Action admin | permiso y transición | Sin picking/tareas |
| 13 | Enviar pedido | estado + tracking | requiere pago en ruta principal | Sin ShipmentItem |
| 14 | Marcar entrega | action/API heredada | controles divergentes | API heredada permite salto arbitrario |
| 15 | Cancelar pedido | action + release stock | ruta principal transaccional | API heredada no libera ni valida |
| 16 | Reembolsar | `refundOrder/applyRefund` | permiso y claim | Automático solo MP; no parcial |
| 17 | Devolver producto | página/política | ninguno transaccional | Ausente |
| 18 | Restaurar inventario | ledger + helpers | transacción/idempotencia | No modela estado del artículo |
| 19 | Notificar cliente | Resend | best-effort | Sin outbox/deduplicación |
| 20 | Auditar admin | `AuditLog`/logs | cobertura amplia | Rutas heredadas solo `console` |

## 7. Procesos completos

Completos en el código revisado, no certificados contra proveedores reales:

- recálculo del checkout en servidor;
- idempotencia de creación de orden;
- relación variante-producto validada al comprar;
- decremento atómico y ledger de inventario;
- ajuste absoluto con CAS;
- liberación/restauración idempotente basada en movimientos;
- reserva con vencimiento para pagos de pasarela;
- claim atómico de confirmación para Culqi, Mercado Pago y PayPal;
- verificación de importe y moneda en confirmadores;
- acceso al pedido mediante cliente autenticado o `viewToken`;
- login admin con bcrypt, cookie HttpOnly y sesiones revocables;
- validación de tamaño/magic bytes de comprobantes;
- envío a Mercado Pago del total autoritativo y datos consistentes del comprador.

## 8. Procesos incompletos

- Inicio de pago: integrado, pero no idempotente ni restringido a órdenes pagables.
- Yape/Plin: aprobación transaccional, pero un upload posterior reabre el claim.
- Refund: efectos internos idempotentes; devolución monetaria automática solo MP.
- Estados: Server Action coherente; API heredada hace escritura directa.
- Fulfillment: estado global sin cantidades, paquetes ni múltiples envíos.
- Carrito: invitado local, sin fusión con modelos persistentes.
- Snapshot: `variantOptions` puede proceder del payload y falta SKU autoritativo.
- Restricciones geográficas: distrito se usa mejor que provincia/departamento.
- Notificaciones: sin cola, outbox o reintento persistente.
- Privacidad: sin flujo autoservicio completo de exportación/eliminación.
- Operación: cron y migraciones no comprobados en despliegue.
- CI: no ejecuta Playwright.

## 9. Procesos ausentes

- `PaymentAttempt`, `PaymentTransaction` y ledger financiero normalizado.
- `Return`, `ReturnItem`, aprobación, recepción e inspección.
- Reembolsos parciales/múltiples y cambios.
- Contracargos y disputas.
- `Shipment`, paquetes y cantidades cumplidas por línea.
- Inventario por ubicación, transferencias, dañado y tránsito.
- Inbox/outbox, worker, backoff y dead-letter queue.
- Conciliación automática de cobros huérfanos y estados `VERIFYING`.
- Health/readiness/liveness y runbooks de restauración.
- Gift cards/crédito de tienda.
- Marketplace, payouts y aislamiento multiempresa.

## 10. Bloqueadores para producción

1. ~~Cerrar ADV-01 y añadir regresiones de reapertura/concurrencia.~~ **Hecho**
   (sección 29).
2. Crear un intento de pago único (`PaymentAttempt` + idempotency key) para
   ADV-02. **Pendiente**; la mitad de conciliación ya está hecha: el segundo cobro
   se detecta y se registra.
3. ~~Impedir pagos para `CANCELLED`, `REFUNDED` y reservas vencidas (ADV-03).~~
   **Hecho** (sección 29).
4. ~~Retirar la API heredada o delegarla a la máquina transaccional (ADV-04).~~
   **Hecho** (sección 29).
5. Implementar estados de refund y devolución monetaria por proveedor.
6. Modelar devoluciones y fulfillment por cantidades.
7. Persistir webhooks y crear conciliación/SLA para `VERIFYING`.
8. Configurar protección degradada, MFA y alertas.
9. Resolver dependencias High tras pruebas de compatibilidad.
10. Ejecutar los 20 flujos en staging con BD y proveedores sandbox estables.

## 11. Vulnerabilidades críticas

### ADV-01 — Reapertura de comprobante y doble descuento — CERRADO

> **Estado: remediado** (sección 29). Hallazgo original a continuación.

`actions/pending-payments.ts:62-65` comprueba orden y token, pero no estado. En
`104-119` restablece incondicionalmente `status="pending"` y
`paymentStatus="VERIFYING"`. Luego
`lib/payments/verify-pending-payment.ts:75-123` vuelve a reclamar ese `pending`,
marca `PAID` y genera otro movimiento `SALE`. El claim evita dos aprobadores
simultáneos del mismo estado, pero no evita que el cliente recree ese estado.

### ADV-02 — Sesiones múltiples y segundo cobro invisible — MITIGADO PARCIAL

> **Estado: la mitad "invisible" está cerrada** (sección 29): el segundo cobro se
> detecta comparando ids y queda anotado para reembolso. La mitad "sesiones
> múltiples" sigue abierta: no existe `PaymentAttempt` ni idempotency key, así que
> el doble cobro sigue siendo posible — pero ya no pasa desapercibido.

`actions/payment-redirect.ts:45-97` crea una preferencia/orden nueva en cada
llamada y solo bloquea `PAID`. Las páginas Mercado Pago
`pago-mercadopago/page.tsx:24-65` y PayPal
`pago-paypal/page.tsx:24-86` repiten la creación en cada visita. No se persiste
un ID de intento activo ni se usa una clave de idempotencia del proveedor.

Si dos pestañas crean y pagan dos sesiones, el primer pago deja la orden `PAID`.
El segundo evento retorna `ignored` en
`lib/mercadopago/confirm-payment.ts:117-120` o
`lib/paypal/confirm-payment.ts:84-86`. `claimOrderAsPaid` también considera
cualquier orden ya pagada como `already-paid` sin comparar el ID del proveedor
(`lib/payments/order-payment-state.ts:81-87`). El segundo dinero capturado no se
convierte en registro huérfano ni dispara refund/alerta.

## 12. Vulnerabilidades altas

- **ADV-03 — CERRADO** (sección 29): iniciadores solo bloquean `PAID`; una orden
  cancelada o reembolsada todavía puede generar una URL cobrable.
- **ADV-04 — CERRADO** (sección 29): `app/api/admin/orders/update-status/route.ts:21-52`
  escribe estados directos sin transición, coherencia pago/stock, refund ni
  auditoría durable. Era además código muerto: la UI real usa el Server Action.
- **ADV-05:** `actions/refunds.ts:12-15,48-68` marca efectos internos para
  métodos no MP aunque el dinero se devuelva manualmente.
- **ADV-06:** no existen modelos de devolución; no se limita cantidad ni doble
  restock.
- **ADV-07:** no existe fulfillment por línea; no hay envío parcial confiable.
- **ADV-08:** `VERIFYING` está excluido deliberadamente del barrido
  (`reservation-policy.ts:70-86`) y no se halló reconciliador con SLA.
- **ADV-09:** webhooks sin inbox durable dependen de retención/reintentos externos.
- **ADV-10:** `lib/rate-limit.ts:233-246` permite toda petición si Redis falta o
  falla, también en login/checkout.
- **ADV-11:** `Order.version` existe, pero las escrituras no lo aplican
  uniformemente.
- **ADV-12:** npm reporta 3 High y 2 Moderate en producción, incluidos PostCSS y
  Sharp transitivos bajo Next.
- **ADV-13:** administración propia sin MFA para refunds, permisos y settings.

## 13. Vulnerabilidades medias

- **ADV-14:** no hay constraints SQL para cantidades, precios, descuentos y
  totales no negativos.
- **ADV-15:** token de `AdminSession` recuperable en BD en vez de hash.
- **ADV-16:** upload general usa autenticación, no permiso granular de media.
- **ADV-17:** mutaciones de configuración del libro de reclamaciones tienen
  autorización menos granular.
- **ADV-18:** comprobantes Yape/Plin se guardan como Blob público.
- **ADV-19:** borrado físico de productos con stock cero puede borrar movimientos
  por relaciones `onDelete: Cascade`.
- **ADV-20:** rutas de diagnóstico/test aparecen en el build de producción.
- **ADV-21:** no se evidenció validación explícita uniforme de Origin/CSRF.
- **ADV-22:** el CI no ejecuta E2E y usa una URL de BD ficticia sin servicio.
- **ADV-23:** `vercel.json` usa build explícito mientras existe un
  `vercel-build` con warmup/retry; debe comprobarse cuál gobierna el despliegue.
- **ADV-24:** script de diagnóstico de últimos pagos puede imprimir email e ID
  del pagador en terminal/log compartido.

## 14. Vulnerabilidades bajas

- **ADV-25:** `/api/test` y páginas como `/test-simple` aumentan superficie y
  filtran presencia/estado básico.
- **ADV-26:** logs heredados con `console` pierden estructura y request ID.
- **ADV-27:** CSP con `style-src 'unsafe-inline'` reduce defensa en profundidad.
- **ADV-28:** middleware basado en patrones de URL es heurístico y puede producir
  falsos positivos/negativos.
- **ADV-29:** tres advertencias de lint reflejan deuda menor en UI/email.
- **ADV-30:** convención `middleware` aparece deprecada en Next 16.

## 15. Riesgos de integridad de datos

- Doble movimiento `SALE` y stock reducido dos veces por ADV-01.
- Dos pagos externos asociados conceptualmente a una sola orden por ADV-02.
- Estados imposibles y timestamps incoherentes por ADV-04.
- `PendingPayment.status` como string y sin transición protegida.
- `Order.version` decorativo en múltiples escritores.
- Snapshot incompleto de SKU/opciones.
- Cascadas que pueden eliminar historia de inventario.
- Falta de checks SQL de cantidades y dinero.
- Ausencia de entidades relacionales para pagos, refunds, returns y shipments.

## 16. Riesgos de pérdida de dinero

- Cliente paga dos preferencias/órdenes externas y el segundo cobro se ignora.
- Cliente paga después de cancelación/reembolso y requiere conciliación manual.
- Refund interno queda completo mientras el refund externo sigue manual.
- Fallo tras devolver dinero en MP y antes de aplicar efectos internos.
- Evento webhook perdido deja dinero y orden divergentes.
- `VERIFYING` sin SLA retiene fondos/stock y eleva contracargos.
- Cambio administrativo puede cancelar una orden pagada sin refund.

## 17. Riesgos de pérdida de inventario

- Reaprobación manual descuenta dos veces.
- Cancelación heredada no libera unidades.
- `VERIFYING` retiene stock indefinidamente.
- Orden cobrada después de cancelación puede tener stock ya liberado.
- Borrado físico degrada el ledger.
- Sin ubicación no se conoce disponibilidad por almacén.
- Sin `ReturnItem` no hay cantidad ni condición autoritativa para restock.

## 18. Riesgos de privacidad

- Sesiones administrativas recuperables si se exfiltra la BD.
- Comprobantes financieros servidos desde Blob público.
- Script operativo imprime identificadores/email de pagos.
- Retención de pedidos, comprobantes y logs no documentada en código.
- Exportación/eliminación integral del cliente no verificada.
- Rutas diagnósticas aumentan exposición accidental.
- No se verificaron acceso operativo, DPA o retención de terceros.

## 19. Riesgos operativos

- E2E local bloqueado por TLS a PostgreSQL; no hay entorno hermético.
- El build termina aunque algunas lecturas Prisma fallen durante prerender.
- Sin endpoint de health que compruebe BD, Redis y dependencias.
- Cron de reservas depende de secrets/URL no comprobados.
- Sin inbox, DLQ o consola formal de conciliación.
- Alertas financieras y de inventario no demostradas.
- Sin evidencia ejecutable de backup/restauración, RPO/RTO o rollback.
- Logs de rutas antiguas no están correlacionados.

## 20. Riesgos de rendimiento

- No hay pruebas de carga ni presupuesto de latencia.
- Varias páginas/configuraciones dependen de BD durante render/build.
- Algunas exportaciones/listados cargan cientos o miles de registros.
- Checkout encadena consultas y servicios externos de forma síncrona.
- Notificación, lealtad y SUNAT deben aislarse de la confirmación crítica.
- Creación repetida de preferencias añade llamadas y objetos externos.
- No se midió pool de Prisma/Neon bajo concurrencia serverless.

## 21. Riesgos de escalabilidad

- La consistencia financiera depende de una fila `Order`, no de un ledger.
- Webhooks procesan trabajo en request sin cola propia.
- Redis caído elimina protección en vez de degradar por niveles.
- No hay partición lógica por tienda ni región.
- Inventario global único impide múltiples almacenes.
- Exportaciones y jobs carecen de paginación/streaming uniforme.
- No hay evidencia de pruebas de carrera a escala para todos los escritores.

## 22. Riesgos de mantenibilidad

- Server Actions y APIs heredadas implementan reglas diferentes.
- Estados y side effects están distribuidos entre actions, rutas y helpers.
- Pago se representa en campos de `Order` más un `PendingPayment` específico.
- Comentarios reconocen procesos manuales sin entidad que los controle.
- Rutas diagnósticas permanecen compiladas.
- Configuración de build tiene dos caminos potenciales.
- Tests nuevos no cubren `startGatewayCheckout` ni el constructor de preferencia.

## 23. Pruebas faltantes

Prioridad obligatoria:

1. Reupload después de pago manual verificado/rechazado/cancelado.
2. Dos uploads y dos aprobaciones concurrentes.
3. Dos llamadas simultáneas a `startGatewayCheckout`.
4. Dos preferencias MP pagadas para la misma orden.
5. Dos órdenes PayPal capturadas para la misma orden interna.
6. Intentar iniciar pago en `CANCELLED`, `REFUNDED`, `PAID` y reserva vencida.
7. Segundo payment ID sobre orden ya pagada debe registrarse como huérfano.
8. Endpoint heredado frente a todas las transiciones inválidas.
9. Refund por Culqi/PayPal/manual con fallo y reintento.
10. Redis ausente/caído en login, checkout, uploads y cupones.
11. Replay/out-of-order de webhooks y caída de BD.
12. Stock concurrente: checkout, cancelación, expiración y webhook.
13. Return parcial, restock parcial y artículo dañado cuando se implemente.
14. E2E de los 20 flujos en CI con PostgreSQL efímero.
15. Pruebas de carga sobre catálogo, checkout, webhooks e inventario.
16. Restauración de backup y simulacro de rollback.

## 24. Tabla maestra de hallazgos

Estados permitidos usados: `CONFIRMED`, `PROBABLE`, `REQUIRES TEST`,
`NOT VERIFIED`, y tras la remediación `FIXED` / `PARTIALLY FIXED` (ver sección
29). Prioridad P0 es inmediata; P3 es deuda planificable.

| ID | Categoría | Severidad | Estado | Archivo/línea | Evidencia | Escenario | Impacto | Prob. | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADV-01 | Pago/inventario | Critical | **FIXED** | `actions/pending-payments.ts:95-190` | Reabría `pending` y repetía `SALE` | Reupload + aprobación | Stock/orden corruptos | Alta | Hecho: guardas de estado + tx con CAS | M | P0 |
| ADV-02 | Pago/dinero | Critical | **PARTIALLY FIXED** | `payment-redirect.ts`; confirmadores MP/PayPal/Culqi | Crea N sesiones; la segunda ya NO se ignora | Dos pestañas pagan | Doble cobro, ahora detectado | Media | Hecho: detección + orphan. Falta `PaymentAttempt` e idempotency key | L | P0 |
| ADV-03 | Pago/estado | High | **FIXED** | `lib/payments/order-payable.ts` | Solo bloqueaba `PAID` | Pagar cancelada/refunded | Captura sin orden pagable | Media | Hecho: predicado único `canStartPayment` en los 4 iniciadores | S | P0 |
| ADV-04 | Admin/órdenes | High | **FIXED** | ruta eliminada | Update directo sin validar | Salto/cancelación incoherente | Dinero/stock/estado | Media | Hecho: ruta y componente muerto retirados | M | P0 |
| ADV-05 | Refund | High | CONFIRMED | `actions/refunds.ts:12-15,48-68` | API externa solo MP | Admin marca refunded | Dinero no devuelto | Media | Estado pending/failed por proveedor | L | P0 |
| ADV-06 | Returns | High | CONFIRMED | `prisma/schema.prisma` | Sin modelos Return | Devolución manual | Fraude/doble restock | Alta | Dominio Return/ReturnItem | L | P1 |
| ADV-07 | Fulfillment | High | CONFIRMED | `prisma/schema.prisma` | Sin Shipment/items | Envío parcial | Estado falso | Media | Shipment por cantidades | L | P1 |
| ADV-08 | Conciliación | High | CONFIRMED | `reservation-policy.ts:70-86` | `VERIFYING` excluido | Timeout Culqi | Stock/fondos retenidos | Media | Worker, SLA y alertas | M | P0 |
| ADV-09 | Webhooks | High | CONFIRMED | `app/api/**webhook**` y schema | Sin inbox/DLQ | Evento perdido | Divergencia | Media | Inbox idempotente + worker | L | P1 |
| ADV-10 | Rate limit | High | CONFIRMED | `lib/rate-limit.ts:233-246` | Falla permite | Redis caído + abuso | Fuerza bruta/DoS | Media | Política por riesgo/fallback | M | P0 |
| ADV-11 | Concurrencia | High | CONFIRMED | `schema.prisma:397`; escritores | Version no uniforme | Updates simultáneos | Lost update | Media | Servicio/CAS uniforme | L | P1 |
| ADV-12 | Supply chain | High | CONFIRMED | `package-lock.json` | npm: 3H/2M | Payload vulnerable | XSS/lectura/imagen | Media | Upgrade probado/mitigación | M | P0 |
| ADV-13 | Admin auth | High | CONFIRMED | auth/admin UI | Sin MFA | Cuenta comprometida | Control total | Media | MFA/step-up | M | P0 |
| ADV-14 | BD | Medium | CONFIRMED | `schema.prisma:315-427` | Sin checks monetarios | Bug escribe negativos | Integridad | Baja | CHECK + validación | M | P1 |
| ADV-15 | Sesión | Medium | CONFIRMED | modelo `AdminSession` | Token recuperable | Exfiltración BD | Secuestro sesión | Baja | Hash del token | M | P1 |
| ADV-16 | Archivos | Medium | CONFIRMED | `app/api/upload` | Auth sin permiso media | Usuario sube contenido | Abuso/costo | Media | RBAC granular | S | P1 |
| ADV-17 | Autorización | Medium | CONFIRMED | complaint admin routes | Permiso poco granular | Usuario modifica formulario | Integridad legal | Baja | Permiso específico | S | P1 |
| ADV-18 | Privacidad | Medium | CONFIRMED | `pending-payments.ts:96-101` | Blob `public` | URL filtrada | Exposición financiera | Media | Blob privado/signed URL | M | P1 |
| ADV-19 | Ledger stock | Medium | CONFIRMED | `schema.prisma:674-675` | Movimientos cascade | Borrar producto | Pierde auditoría | Media | Soft delete/RESTRICT | M | P1 |
| ADV-20 | Superficie | Medium | CONFIRMED | rutas del build | Debug/test desplegables | Acceso público | Info leak | Media | Excluir/404 prod | S | P1 |
| ADV-21 | CSRF | Medium | REQUIRES TEST | actions/routes | Control Origin no uniforme hallado | Cross-site mutation | Cambio no deseado | Baja | Test Origin/CSRF | M | P1 |
| ADV-22 | CI | Medium | CONFIRMED | `.github/workflows/ci.yml` | Sin E2E/BD | Regresión llega a master | Calidad | Alta | Job E2E con Postgres | M | P1 |
| ADV-23 | Deploy | Medium | PROBABLE | `vercel.json`; `scripts/vercel-build.mjs` | Dos comandos | Warmup no corre | Fallo release | Media | Unificar y probar | S | P1 |
| ADV-24 | Privacidad ops | Medium | CONFIRMED | `scripts/mercadopago-last-payments.ts` | Imprime PII | Log compartido | Exposición | Baja | Redactar/flag explícito | S | P2 |
| ADV-25 | Info leak | Low | CONFIRMED | `/api/test`, test pages | Rutas en build | Enumeración | Menor | Media | Eliminar de prod | S | P2 |
| ADV-26 | Logging | Low | CONFIRMED | rutas heredadas | `console` | Incidente | Trazabilidad baja | Alta | Logger estructurado | S | P2 |
| ADV-27 | CSP | Low | CONFIRMED | headers/middleware | `unsafe-inline` styles | Inyección auxiliar | Menor | Baja | Nonce/hash gradual | M | P3 |
| ADV-28 | WAF heurístico | Low | CONFIRMED | middleware | Regex URL | Evasión/falso positivo | Menor | Media | Validación por endpoint | M | P3 |
| ADV-29 | Calidad | Low | CONFIRMED | salida ESLint | 3 warnings | Deuda crece | Menor | Alta | Corregir warnings | S | P3 |
| ADV-30 | Framework | Low | CONFIRMED | salida build | middleware deprecado | Upgrade futuro | Menor | Alta | Migrar a proxy | S | P3 |

## 25. Matriz de madurez por proceso

Leyenda: `Sí`, `Parcial`, `No`, `NV` = no verificado en entorno real.

| Proceso | Implementado | Integrado | Probado | Seguro | Idempotente | Tx | Observable | Producción |
|---|---|---|---|---|---|---|---|---|
| Catálogo | Sí | Sí | Parcial | Parcial | Parcial | Sí | Parcial | NV |
| Inventario | Sí | Sí | Sí | Sí | Sí | Sí | Parcial | NV |
| Carrito | Sí | Parcial | Sí | Parcial | No | No | No | NV |
| Crear orden | Sí | Sí | Sí | Sí | Sí | Sí | Parcial | NV |
| Iniciar pago | Sí | Sí | No | No | No | No | Parcial | No |
| Confirmar pasarela | Sí | Sí | Sí | Parcial | Parcial | Sí | Parcial | No |
| Pago manual | Sí | Sí | Parcial | No | No | Sí | Parcial | No |
| Webhooks | Sí | Sí | Parcial | Parcial | Parcial | Parcial | Parcial | No |
| Estados orden | Sí | Sí | Parcial | No | No | Parcial | Parcial | No |
| Fulfillment | Parcial | Parcial | Parcial | Parcial | No | Parcial | Parcial | No |
| Cancelación | Sí | Sí | Parcial | Parcial | Sí | Parcial | Parcial | No |
| Refund | Parcial | Parcial | Parcial | No | Parcial | Parcial | Parcial | No |
| Return | No | No | No | No | No | No | No | No |
| Notificaciones | Sí | Sí | Parcial | Parcial | No | No | Parcial | NV |
| Administración | Sí | Sí | Parcial | Parcial | No | Parcial | Parcial | No |
| Operación/DR | Parcial | Parcial | No | Parcial | No | No | Parcial | No |

## 26. Matriz de seguridad

| Control | Cliente | Admin | API pública | Webhooks | Pagos | Estado |
|---|---|---|---|---|---|---|
| Autenticación | Clerk/token | Sesión propia | Según ruta | N/A | `viewToken`/orden | Parcial |
| Autorización | Propiedad pedido | RBAC | Desigual | Evento/proveedor | Propiedad | Parcial |
| Validación input | Zod/servidor | Zod parcial | Zod parcial | Parse + verify | Importe/moneda | Parcial |
| Rate limit | Parcial | Login parcial | Parcial | No principal | Upload/checkout | Fail-open |
| Idempotencia | Orden | Parcial | Parcial | Claim parcial | Inicio no, final sí | Insuficiente |
| Transacción | Checkout | Algunas acciones | Variable | Variable | Claim sí | Parcial |
| Secretos | NV | Cookie HttpOnly | Entorno | Entorno/settings | Entorno/settings | NV |
| CSRF/Origin | SameSite/Clerk | SameSite | No uniforme | Firma/consulta | Token | Requiere prueba |
| Auditoría | Cuenta/pedido | `AuditLog` parcial | Logs | Pino | Logs/campos Order | Insuficiente |
| PII | BD/terceros | Panel | Respuestas | Payload | Blob/script | Parcial |
| Dependencias | 5 alertas prod | 5 alertas prod | 5 alertas prod | 5 alertas prod | 5 alertas prod | No conforme |
| MFA | Proveedor Clerk posible | No implementado | N/A | N/A | Step-up ausente | No conforme |

## 27. Roadmap de remediación

### Fase 0 — Contención inmediata (0-48 h) — COMPLETADA salvo un punto

- ~~Bloquear upload de comprobante salvo `PENDING/VERIFYING` y pago `pending`.~~
- ~~Bloquear inicio de pasarela salvo estado/pago/reserva explícitamente pagables.~~
- ~~Desactivar/delegar `/api/admin/orders/update-status`.~~
- ~~Alertar manualmente sobre órdenes con múltiples IDs de proveedor.~~ Ahora es
  automático: el cobro duplicado se anota en `Order.adminNotes` y se registra con
  `log.error`. Falta enganchar esa señal a una alerta real (Sentry/email).
- **Pendiente:** restringir acceso público a comprobantes (ADV-18).

### Fase 1 — Integridad de pagos (semana 1)

- Crear `PaymentAttempt` con índice único de intento activo por orden/proveedor.
- Persistir preference/order ID antes de redirigir.
- Usar idempotency keys soportadas por proveedor.
- Comparar cada confirmación con el pago ya registrado.
- Registrar segundo cobro como `OrphanPayment`, alertar y preparar refund.
- Añadir pruebas concurrentes ADV-01/02/03.

### Fase 2 — Estados y refunds (semanas 1-2)

- Servicio único de transición transaccional para todas las entradas.
- Estados `REFUND_PENDING`, `REFUND_SUCCEEDED`, `REFUND_FAILED`.
- Adaptadores Culqi/PayPal/MP y workflow manual verificable.
- Aplicar `Order.version` o CAS de forma uniforme.

### Fase 3 — Postventa y fulfillment (semanas 2-4)

- `Return`, `ReturnItem`, motivos, condición e inspección.
- Refund/restock por cantidades.
- `Shipment`, paquetes, tracking y fulfillment parcial.
- Cambios y contracargos.

### Fase 4 — Resiliencia operativa (semanas 3-5)

- Inbox de webhooks, worker, retries y DLQ.
- Reconciliador de `VERIFYING`, huérfanos, refunds y stock.
- Outbox de email/SUNAT/lealtad.
- Health/readiness y alertas con runbooks.
- Backups y prueba de restauración.

### Fase 5 — Seguridad y cadena de suministro (semanas 4-6)

- MFA/step-up para administración.
- Hash de tokens de sesión y rotación.
- Rate limit por riesgo con fallback local/controlado.
- RBAC granular, CSRF/Origin y rutas debug fuera de producción.
- Resolver 3 High/2 Moderate con pruebas de compatibilidad.
- Checks SQL y soft delete/RESTRICT para ledger.

### Fase 6 — Certificación de producción

- PostgreSQL efímero y Playwright en CI.
- 20 flujos obligatorios más casos de carrera/fallo.
- Proveedores sandbox y replay de webhooks.
- Carga, soak, límites de Neon/Vercel/Redis.
- Simulacro de rollback/restore y aprobación formal de riesgos residuales.

## 28. Veredicto final

**No preparado**, con el riesgo P0 materialmente reducido.

La aplicación posee una base de checkout e inventario mejor que la de un
prototipo, y las pruebas unitarias actuales son estables. Los hallazgos ADV-01,
ADV-03 y ADV-04 —pérdida material de inventario, cobro sobre órdenes terminales y
estados administrativos incoherentes— están cerrados con pruebas de regresión.
ADV-02 pasó de "doble cobro invisible" a "doble cobro detectado y reembolsable",
que es una diferencia grande en impacto pero no una solución completa.

Siguen bloqueando la preparación: refunds multi-proveedor (ADV-05), ausencia de
postventa y fulfillment por cantidades (ADV-06/07), conciliación de `VERIFYING`
(ADV-08), inbox de webhooks (ADV-09), rate limiting fail-open (ADV-10) y MFA
(ADV-13).

La reevaluación debe repetirse después de Fases 1-2 con evidencia de migración,
tests concurrentes, E2E de staging y pagos sandbox. Hasta entonces, la operación
solo sería aceptable en un piloto de bajo volumen con conciliación manual diaria
—ahora asistida por las notas automáticas de cobro duplicado— y capacidad
inmediata de detener cobros.

## 29. Remediación aplicada (2026-07-29)

Verificada con **289/289 pruebas Vitest** (26 archivos; +44 sobre las 245
originales), TypeScript sin errores, ESLint con 0 errores y las 3 advertencias
preexistentes, y build de producción correcto.

### Cambios

| Hallazgo | Qué se hizo | Archivos |
|---|---|---|
| ADV-03 | Predicado único `canStartPayment` (terminales + `VERIFYING` + reserva vencida), consumido por los 4 iniciadores. Las listas de estados terminales pasan a ser la única fuente compartida con el claim final. | **nuevo** `lib/payments/order-payable.ts`, `actions/payment-redirect.ts`, `actions/payments.ts`, `pago-mercadopago/page.tsx`, `pago-paypal/page.tsx`, `pago-tarjeta/page.tsx` |
| ADV-03 (Culqi) | El claim previo al cargo exigía sólo `paymentStatus: "PENDING"`; una orden **cancelada conserva ese estado de pago**, así que se podía cobrar una tarjeta por un pedido cerrado. Ahora exige además estado no terminal y reserva viva. | `actions/payments.ts` |
| ADV-01 | Guardas de estado (pago `pending`, orden no terminal, pago no resuelto) y las dos escrituras en **una transacción con CAS**. Se dejó de escribir `status: "pending"`, que era el vector exacto de la resurrección. Rollback vía excepción, no `return`. | `actions/pending-payments.ts` |
| ADV-02 | `claimOrderAsPaid` devuelve el `paymentId`/`paymentProvider` ganador; `isDuplicateProviderPayment` compara ids; los 4 confirmadores registran el segundo cobro como `kind: "duplicate"` con nota accionable en `Order.adminNotes`. | `lib/payments/order-payment-state.ts`, `lib/mercadopago/confirm-payment.ts`, `lib/paypal/confirm-payment.ts`, `app/api/culqi/webhook/route.ts`, `actions/payments.ts` |
| ADV-04 | Ruta heredada y su componente cliente eliminados (ambos código muerto: la UI real usa el Server Action con validación de transiciones). | eliminados `app/api/admin/orders/update-status/route.ts`, `components/admin/UpdateOrderStatus.tsx` |

### Efecto colateral detectado y cubierto

Pedirle al admin que reembolse el cobro duplicado hace que Mercado Pago envíe un
webhook `refunded` **con el id de ese pago**. Sin protección, `applyRefund`
reembolsaba el pedido entero —restaurando stock y revirtiendo puntos— pese a que
el pago legítimo seguía en pie. La detección de duplicados se colocó por eso
**antes** de las ramas de reembolso, con test dedicado.

### Nuevas pruebas

- `lib/payments/order-payable.test.ts` — 13 casos del predicado, incluido el
  agujero original (cancelada con pago `PENDING`) y la coherencia entre la lista
  del iniciador y la del claim.
- `actions/pending-payments.test.ts` — 10 casos: camino normal, los cuatro
  rechazos de ADV-01 y las dos carreras con el admin durante la subida a Blob.
- `lib/mercadopago/confirm-payment.test.ts` — 10 casos, incluido el reembolso del
  duplicado frente al del cobro aplicado.
- Ampliados `lib/payments/order-payment-state.test.ts`,
  `lib/paypal/confirm-payment.test.ts`, `app/api/culqi/webhook/route.test.ts`.

### Consecuencia operativa a vigilar

`canStartPayment` bloquea el pago cuando la reserva venció. Si el cron de
`release-expired-reservations` no corre (ADV-08, no verificado en despliegue), un
pedido de pasarela deja de ser pagable a los `ORDER_RESERVATION_MINUTES` (60 por
defecto) y el cliente recibe la indicación de volver a pedirlo. Es la dirección
segura —no cobrar sin stock respaldado— pero conviene confirmar que ese cron está
activo antes de operar con tráfico real.

### Lo que esta remediación NO hace

- No crea `PaymentAttempt` ni usa idempotency keys del proveedor: **el doble cobro
  sigue siendo posible**, sólo deja de ser invisible.
- No implementa reembolso automático del duplicado (requiere ADV-05, el adaptador
  de refund por proveedor). La devolución sigue siendo manual.
- No toca ADV-05 a ADV-30.
