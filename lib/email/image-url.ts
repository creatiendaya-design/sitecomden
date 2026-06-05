/**
 * Helpers para resolver URLs de imágenes que se incrustan en correos.
 *
 * Los clientes de correo (Gmail, Outlook, Apple Mail) NO resuelven rutas
 * relativas: necesitan URLs absolutas. Además, la mayoría no renderiza SVG
 * dentro de `<img>`. Estos helpers centralizan ambas reglas para que todas
 * las plantillas reciban URLs ya saneadas.
 */

const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

/**
 * Convierte cualquier ruta en una URL absoluta utilizable en un correo.
 * - URLs absolutas (http/https) se devuelven tal cual.
 * - Rutas relativas se prefijan con el dominio del sitio.
 * - `data:` URIs y valores vacíos se descartan (no son fiables en email).
 */
export function resolveEmailImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${SITE_URL}${path}`;
}

/**
 * Resuelve la URL del logo para correos. Igual que `resolveEmailImageUrl`
 * pero descarta SVG porque casi ningún cliente de correo lo renderiza; en
 * ese caso las plantillas hacen fallback al nombre de la tienda.
 */
export function resolveEmailLogoUrl(url?: string | null): string | undefined {
  const absolute = resolveEmailImageUrl(url);
  if (!absolute) return undefined;
  if (/\.svg(\?.*)?$/i.test(absolute)) return undefined;
  return absolute;
}
