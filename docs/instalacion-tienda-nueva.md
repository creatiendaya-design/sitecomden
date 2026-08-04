# Instalación de una tienda nueva (multi-instancia)

Guía para montar **otra tienda** con este mismo sistema **sin convertirlo en SaaS**.

El enfoque es **multi-instancia**: el sistema sigue siendo single-tenant (una tienda
por despliegue), pero levantamos varias copias independientes del **mismo repositorio**,
cada una con su propia base de datos, sus propias variables de entorno y su propio
dominio. Cero cambios de código y aislamiento total entre tiendas.

> Pensado para 2–10 tiendas. Si en el futuro quieres vender el sistema a terceros
> como plataforma, ahí sí conviene migrar al modelo multi-tenant real (`storeId`).

---

## Modelo de despliegue

| Tienda   | Proyecto Vercel    | Base de datos Neon | Dominio       |
|----------|--------------------|--------------------|---------------|
| Tienda 1 | shopgood-tienda1   | neon-db-1          | tienda1.com   |
| Tienda 2 | shopgood-tienda2   | neon-db-2          | tienda2.com   |
| Tienda 3 | shopgood-tienda3   | neon-db-3          | tienda3.com   |

**Clave del modelo:**

- **Un solo repositorio Git** → varios proyectos de Vercel apuntando a él. Programas
  una sola vez; un `git push` redeploya todas las tiendas automáticamente.
- **Una base de datos por tienda** → aislamiento físico. Una tienda nunca puede ver
  datos de otra.
- **Variables de entorno por proyecto** → cada tienda usa sus propias credenciales.

---

## Requisitos previos (cuentas/servicios)

Por cada tienda necesitas decidir qué recursos **separas** y cuáles **compartes**.
Recomendación cuando todas las tiendas son tuyas:

| Servicio | ¿Separar por tienda? | Por qué |
|----------|----------------------|---------|
| **Neon (DATABASE_URL)** | ✅ Siempre separar | Es el aislamiento de datos. Imprescindible. |
| **Culqi** (pagos tarjeta) | ✅ Separar | Cada tienda cobra a su propia cuenta/RUC. |
| **NubeFact / SUNAT** | ✅ Separar | Facturación electrónica va por RUC de cada tienda. |
| **Clerk** (login clientes) | ✅ Separar | Cada tienda tiene su propio padrón de clientes y dominio. |
| **Dominio** | ✅ Separar | Obvio. |
| **Resend** (emails) | ⚙️ Opcional | Puedes compartir la cuenta; usa un dominio/remitente por tienda. |
| **Vercel Blob** (imágenes) | ⚙️ Opcional | Cada proyecto Vercel ya trae su propio store; sepáralo si quieres. |
| **Upstash Redis** (rate limit) | ⚙️ Opcional | Se puede compartir; separar evita que el límite de una afecte a otra. |
| **Cloudflare Stream** (video) | ⚙️ Opcional | Compartible; es opcional (si está vacío, el video cae a Vercel Blob). |
| **Sentry** (errores) | ⚙️ Opcional | Un proyecto Sentry por tienda ayuda a separar alertas. |

---

## Paso 1 — Crear la base de datos (Neon)

1. En [Neon](https://neon.tech) crea un **proyecto/base de datos nuevo** para la tienda.
2. Copia su connection string (con `?sslmode=require`). Será el `DATABASE_URL`.

## Paso 2 — Crear el proyecto en Vercel

1. En Vercel, **New Project** → importa **el mismo repositorio Git** que las demás tiendas.
2. Nómbralo de forma identificable (`shopgood-tienda2`).
3. **No despliegues todavía**: primero configura las variables de entorno (Paso 3).

## Paso 3 — Configurar variables de entorno

Copia [.env.example](../.env.example) como referencia. En el proyecto de Vercel
(Settings → Environment Variables) define estas variables con los valores **de esta tienda**:

```bash
# Base de datos (de esta tienda — Neon)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"

# URL pública de la tienda — FUENTE ÚNICA de la URL canónica.
# La resuelve `lib/site-url.ts` y la consumen sitemap, robots.txt, correos,
# redirects de pago y eventos de tracking. `NEXT_PUBLIC_URL` está deprecada.
NEXT_PUBLIC_APP_URL=https://tienda2.com

# Firma del webhook de Clerk (dashboard → Webhooks → Signing Secret).
# OBLIGATORIA: sin ella no se crea ningún `Customer` y la tienda "parece" ir bien.
CLERK_WEBHOOK_SECRET=whsec_...

# Remitente de correos (dominio verificado en Resend)
RESEND_FROM_EMAIL=pedidos@tienda2.com

# Protege los endpoints de cron. Generar: openssl rand -hex 32
CRON_SECRET=...

# Culqi — pagos con tarjeta
NEXT_PUBLIC_CULQI_PUBLIC_KEY=pk_live_...
CULQI_SECRET_KEY=sk_live_...
CULQI_WEBHOOK_SECRET=...

# Clerk — login de clientes
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Resend — emails transaccionales
RESEND_API_KEY=re_...

# Vercel Blob — imágenes
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Upstash Redis — rate limiting
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# SUNAT — clave de cifrado AES-256 (64 chars hex). Generar: openssl rand -hex 32
SUNAT_ENCRYPTION_KEY=...

# Super Admin inicial (lo crea el seed de permisos)
SEED_ADMIN_EMAIL=admin@tienda2.com
SEED_ADMIN_PASSWORD=...           # mínimo 8 caracteres

# --- Opcionales ---
# Cloudflare Stream (video). Si se dejan vacíos, el video cae a Vercel Blob.
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_STREAM_API_TOKEN=
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=
# Sentry (error tracking)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

> Recuerda configurar el webhook de Clerk en su dashboard apuntando a
> `https://tienda2.com/api/webhooks/clerk`, y el webhook de Culqi a
> `https://tienda2.com/api/webhook`.

## Paso 4 — Aplicar el esquema y datos iniciales

Un solo comando. Pon el `DATABASE_URL` y el resto de variables de la tienda nueva en tu
`.env` local (o expórtalas en la terminal) y ejecuta:

```bash
npm run setup:tienda
```

El script [scripts/setup-tienda-nueva.ts](../scripts/setup-tienda-nueva.ts):

1. **Valida las variables de entorno** antes de tocar nada, separando obligatorias de
   recomendadas. Aborta si falta alguna crítica —incluidas las que no rompen el build
   pero sí la tienda, como `CLERK_WEBHOOK_SECRET` (sin ella no se crea ningún `Customer`).
2. **Te muestra el host y el nombre de la base destino y te exige escribir ese nombre**
   para continuar. Es la protección contra el error caro de este flujo: sembrar la
   tienda nueva encima de la que ya factura.
3. Ejecuta los ~16 pasos de migración y siembra en orden.

Opciones:

```bash
npm run check:env                                   # solo valida, no escribe nada
npx tsx scripts/setup-tienda-nueva.ts --with-optional  # + plantillas landing, COD, FBT…
npx tsx scripts/setup-tienda-nueva.ts --skip-migrate   # el esquema ya está aplicado
npx tsx scripts/setup-tienda-nueva.ts --local          # permite localhost (BD de desarrollo)
npx tsx scripts/setup-tienda-nueva.ts --yes            # sin confirmación (CI)
```

Todos los pasos son idempotentes: si algo falla a mitad, corriges y vuelves a ejecutar.

> ⚠️ Cuando termines, **restaura tu `.env` local** a tu BD de desarrollo.

## Paso 5 — Desplegar y conectar el dominio

1. Lanza el deploy en Vercel (Deployments → Redeploy, o `git push`).
2. En Vercel → Settings → Domains, asigna el dominio de la tienda (`tienda2.com`).
3. Verifica el funcionamiento (ver checklist abajo).

---

## Mantenimiento día a día

### Cambios de código
Un solo repo. Haces `git push` y **Vercel redeploya las N tiendas** automáticamente
(cada proyecto está conectado al mismo repo). No hay que hacer nada por tienda.

### Cambios de esquema (Prisma) — automáticos
No hay que aplicarlas a mano. [vercel.json](../vercel.json) ejecuta `prisma migrate deploy`
como parte del `buildCommand`, y **cada proyecto de Vercel trae su propio `DATABASE_URL`**:
un `git push` redeploya las N tiendas y cada una migra su propia base.

> ⚠️ Esto es justamente por lo que **las migraciones deben seguir dentro del
> `buildCommand`** en este modelo. Sacarlas del build (una recomendación habitual en
> despliegues single-store) te obligaría a aplicarlas manualmente en cada BD.

Solo necesitas hacerlo a mano si una tienda no se redeployó:

```bash
# Apunta DATABASE_URL a su BD y ejecuta
npx prisma migrate deploy
```

### Permisos nuevos
Cuando el código agrega permisos nuevos, corre en cada BD (es idempotente):

```bash
npx tsx scripts/sync-all-permissions.ts
```

---

## Checklist de verificación por tienda

- [ ] La home carga con el tema correcto en el dominio de la tienda.
- [ ] Puedo entrar a `/admin-auth` con el Super Admin sembrado.
- [ ] El panel `/admin` muestra los permisos completos (no faltan secciones).
- [ ] Login/registro de clientes (Clerk) funciona y el webhook crea el `Customer`.
- [ ] Checkout: aparecen los métodos de pago y Culqi usa **las llaves de esta tienda**.
- [ ] Envíos: las zonas/tarifas y los distritos de Perú están cargados.
- [ ] Facturación SUNAT (si aplica) usa el RUC/credenciales de esta tienda.
- [ ] Emails transaccionales salen con el remitente correcto.
- [ ] El `DATABASE_URL` de mi `.env` local está restaurado a desarrollo.

---

## Por qué esto no cierra el futuro multi-tenant

Montar tiendas en multi-instancia **no estorba** una migración futura a SaaS real
(`storeId` + resolución por dominio). De hecho te sirve para validar el producto con
tiendas reales antes de invertir en la arquitectura multi-tenant. Ver la visión a
futuro en `CLAUDE.md` → *Pending / Open Items → Multi-tenant*.
