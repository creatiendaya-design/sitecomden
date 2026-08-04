/**
 * 🌐 Resolución canónica de la URL pública de la tienda.
 *
 * Por qué existe este módulo (modelo multi-instancia):
 * este repositorio se despliega N veces —una tienda por proyecto de Vercel,
 * cada una con su propio dominio y su propia BD (ver
 * `docs/instalacion-tienda-nueva.md`). Antes de esto, la URL base se resolvía
 * de forma distinta en cada consumidor: unos leían `NEXT_PUBLIC_APP_URL`,
 * otros `NEXT_PUBLIC_URL`, otros la BD, y **todos** tenían un dominio de la
 * tienda #1 horneado como último recurso. En una tienda nueva eso no rompe el
 * build: simplemente emite sitemaps, correos y eventos de tracking apuntando
 * al dominio de otra tienda.
 *
 * Regla única: `NEXT_PUBLIC_APP_URL` manda. La BD (`Setting.site_url`) es el
 * respaldo para instalaciones que aún no la definen. No hay tercer respaldo:
 * si nada resuelve, en desarrollo se usa localhost y en producción se lanza un
 * error, porque emitir la URL equivocada es peor que fallar visiblemente.
 *
 * `NEXT_PUBLIC_URL` quedó deprecado — un único nombre evita que media
 * aplicación resuelva un host y la otra mitad resuelva otro.
 */

const DEV_FALLBACK = "http://localhost:3000";

/** Quita la barra final para que los consumidores puedan concatenar `/ruta`. */
function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function isUsable(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function missingUrlError(): Error {
  return new Error(
    "NEXT_PUBLIC_APP_URL no está definida y no hay `site_url` en la BD. " +
      "Defínela en las variables de entorno de esta tienda " +
      "(ver docs/instalacion-tienda-nueva.md, Paso 3).",
  );
}

/**
 * URL canónica disponible en cliente y servidor **sin tocar la BD**.
 *
 * Úsala en Client Components y en cualquier ruta donde una consulta extra a
 * Neon no se justifique. Next inlinea `NEXT_PUBLIC_APP_URL` en el bundle en
 * tiempo de build, así que en cliente esta es la única fuente posible.
 *
 * @throws si la variable falta en producción.
 */
export function publicSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (isUsable(fromEnv)) return normalize(fromEnv);

  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK;
  throw missingUrlError();
}

/**
 * Igual que `publicSiteUrl()` pero nunca lanza: devuelve `null` cuando no hay
 * URL resoluble. Para consumidores donde un campo opcional vacío es aceptable
 * (p. ej. metadatos de tracking) y tumbar la petición no lo es.
 */
export function publicSiteUrlOrNull(): string | null {
  try {
    return publicSiteUrl();
  } catch {
    return null;
  }
}

/**
 * URL canónica resuelta en servidor, con respaldo en BD.
 *
 * Orden: `NEXT_PUBLIC_APP_URL` → `Setting.site_url` → localhost (solo dev).
 * La consulta a BD solo ocurre si la variable de entorno falta, así que en un
 * despliegue bien configurado esta función no toca Neon.
 *
 * @throws si nada resuelve y estamos en producción.
 */
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (isUsable(fromEnv)) return normalize(fromEnv);

  const fromDb = await readSiteUrlFromDb();
  if (isUsable(fromDb)) return normalize(fromDb);

  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK;
  throw missingUrlError();
}

/**
 * Lee `Setting.site_url` tolerando los dos formatos que conviven en la tabla:
 * string plano (`"https://tienda.com"`) y objeto (`{ url: "https://…" }`),
 * que es como `lib/site-settings.ts` normaliza algunos valores.
 *
 * Los fallos de BD se tragan a propósito: esta función es el respaldo, no la
 * fuente principal, y `robots.txt` / `sitemap.xml` deben seguir respondiendo
 * durante una caída transitoria de Neon.
 */
async function readSiteUrlFromDb(): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const row = await prisma.setting.findUnique({ where: { key: "site_url" } });
    if (!row) return null;

    const { value } = row;
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "url" in value) {
      const url = (value as { url: unknown }).url;
      return typeof url === "string" ? url : null;
    }
    return null;
  } catch {
    return null;
  }
}
