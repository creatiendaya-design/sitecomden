/**
 * Real file rename for Vercel Blob (server-only).
 *
 * Vercel Blob can't rename in place, so a "rename" means: copy the blob to a
 * new SEO-friendly pathname, re-point every reference in the database from the
 * old URL to the new one, then delete the old blob. The new URL contains the
 * descriptive name (good for image SEO), and nothing breaks because all
 * references are rewritten atomically.
 *
 * References are rewritten by scanning every text / jsonb / text[] column in
 * the public schema for the (globally unique) old URL — this guarantees we
 * catch product images, page/landing/category/template block JSON, theme
 * tokens, settings, etc. without having to hardcode the full list.
 */
import { copy, del, head } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { extensionFromPath, pathnameFromUrl } from "./blob-meta";

/** Tables we never rewrite: history/system + MediaFile (handled explicitly). */
const EXCLUDED_TABLES = new Set([
  "_prisma_migrations",
  "AuditLog",
  "AdminSession",
  "MediaFile",
]);

export function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "archivo"
  );
}

/** True for files physically stored in Vercel Blob (renamable). */
export function isVercelBlobUrl(url: string): boolean {
  return url.includes("blob.vercel-storage.com");
}

interface CatalogColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
}

/**
 * Rewrites every occurrence of `oldUrl` → `newUrl` across all eligible columns
 * in one interactive transaction. The old URL is a long unique blob URL, so a
 * substring replace can't produce false positives.
 */
// jsonb and text columns are only scanned when their NAME suggests they may
// hold an image/file URL. This skips noise like Order address / payment JSON
// (big tables, never images) so the rewrite stays fast and pooler-friendly.
// text[] columns are always included (few, small, e.g. ProductReview.images).
const URL_NAME_PATTERN =
  "(image|img|photo|proof|logo|favicon|icon|url|src|content|body|description|zones|media|cover|banner|poster|thumb|file|value|token|scheme|tab|catalog|mockup|design|gallery|slide|avatar|background|bg|settings)";

/** SQL string literal with single quotes escaped (defense-in-depth). */
function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function replaceUrlEverywhere(oldUrl: string, newUrl: string): Promise<void> {
  const columns = await prisma.$queryRawUnsafe<CatalogColumn[]>(
    `SELECT table_name, column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND (
         data_type = 'ARRAY'
         OR (data_type IN ('jsonb', 'json', 'text', 'character varying') AND column_name ~* $1)
       )`,
    URL_NAME_PATTERN
  );

  const oldL = lit(oldUrl);
  const newL = lit(newUrl);
  const likeL = lit(`%${oldUrl}%`);

  // Build ONE PL/pgSQL DO block so every UPDATE runs server-side in a single
  // round trip. With ~60 columns, per-statement pooler latency would otherwise
  // dominate (~12s); a single DO block runs in well under a second. The block
  // is atomic — any error rolls back all updates. URLs are inlined as escaped
  // literals (DO blocks don't take parameters); they're controlled blob URLs
  // and quotes are escaped, so this is injection-safe.
  const lines: string[] = [];
  for (const col of columns) {
    if (EXCLUDED_TABLES.has(col.table_name)) continue;
    const t = `"${col.table_name}"`;
    const c = `"${col.column_name}"`;

    if (col.data_type === "jsonb" || col.data_type === "json") {
      lines.push(
        `UPDATE ${t} SET ${c} = REPLACE(${c}::text, ${oldL}, ${newL})::${col.data_type} WHERE ${c}::text LIKE ${likeL};`
      );
    } else if (col.data_type === "ARRAY") {
      if (col.udt_name !== "_text" && col.udt_name !== "_varchar") continue;
      lines.push(
        `UPDATE ${t} SET ${c} = array_replace(${c}, ${oldL}, ${newL}) WHERE ${oldL} = ANY(${c});`
      );
    } else {
      lines.push(
        `UPDATE ${t} SET ${c} = REPLACE(${c}, ${oldL}, ${newL}) WHERE ${c} LIKE ${likeL};`
      );
    }
  }

  if (lines.length === 0) return;

  const doBlock = `DO $rename$\nBEGIN\n${lines.join("\n")}\nEND\n$rename$;`;
  await prisma.$executeRawUnsafe(doBlock);
}

export interface RenameResult {
  newUrl: string;
  newPathname: string;
  newFilename: string;
}

/**
 * Renames a Vercel Blob file to a slug derived from `displayName`, re-points
 * all DB references, and deletes the old blob. Returns the new URL/pathname.
 *
 * The MediaFile row itself is NOT updated here (the caller does that, so it can
 * also bump the optimistic-lock version and persist alt in the same write).
 */
export async function renameBlobAndRepoint(
  oldUrl: string,
  displayName: string
): Promise<RenameResult> {
  const oldPathname = pathnameFromUrl(oldUrl);
  const slash = oldPathname.lastIndexOf("/");
  const dir = slash === -1 ? "" : oldPathname.slice(0, slash);
  const ext = extensionFromPath(oldUrl);
  const extSuffix = ext ? `.${ext}` : "";
  const origin = (() => {
    try {
      return new URL(oldUrl).origin;
    } catch {
      return "";
    }
  })();

  const slug = slugifyFilename(displayName);

  // Clean URL: use the exact slug. Append a numeric suffix ONLY when a blob
  // with that pathname already exists (Shopify/WordPress style:
  // "suplementoazul.png" → "suplementoazul-1.png" → …).
  const pathFor = (name: string) =>
    dir ? `${dir}/${name}${extSuffix}` : `${name}${extSuffix}`;
  const exists = async (pathname: string): Promise<boolean> => {
    if (!origin) return false;
    try {
      await head(`${origin}/${pathname}`);
      return true;
    } catch {
      return false;
    }
  };

  let base = `${slug}${extSuffix}`;
  let newPathname = pathFor(slug);
  for (let i = 1; await exists(newPathname); i++) {
    base = `${slug}-${i}${extSuffix}`;
    newPathname = pathFor(`${slug}-${i}`);
  }

  // 1) Copy to the new pathname (old blob still exists at this point).
  const blob = await copy(oldUrl, newPathname, { access: "public" });
  const newUrl = blob.url;

  // 2) Re-point references. On failure, remove the just-created copy.
  try {
    await replaceUrlEverywhere(oldUrl, newUrl);
  } catch (error) {
    await del(newUrl).catch(() => {});
    throw error;
  }

  // 3) Delete the old blob (best-effort — references already moved).
  await del(oldUrl).catch(() => {});

  return {
    newUrl,
    newPathname: pathnameFromUrl(newUrl),
    newFilename: base,
  };
}
