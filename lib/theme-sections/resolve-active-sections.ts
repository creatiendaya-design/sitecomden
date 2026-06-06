import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme"
import type { Device } from "@/lib/blocks/types"
import type { Prisma, ThemeSectionGroup } from "@prisma/client"
import type {
  ResolvedThemeSection,
  ResolvedThemeSectionBlock,
  ThemeSectionContent,
} from "./types"

/** Row shape shared by both the group fetch and the product-template fetch. */
type SectionRowWithBlocks = Prisma.ThemeSectionGetPayload<{
  include: { blocks: true }
}>

/**
 * Plan 16 perf: per-(theme, group) cached read of the section rows. Tagged
 * `theme-sections-<themeId>-<group>` so save actions can invalidate
 * precisely without nuking the storefront layout's site-settings / pixels
 * / theme-meta caches. Device flattening happens AFTER the cache hit
 * because it's a CPU-only transform of the cached rows.
 *
 * Plan 19: PRODUCT-group reads no longer go through here — they resolve a
 * per-product template first (see `buildCachedProductTemplateFetch`). The
 * `productTemplateId: null` filter keeps any stray PRODUCT rows out of the
 * non-product groups defensively.
 */
function buildCachedFetch(themeId: string, group: ThemeSectionGroup) {
  const tag = `theme-sections-${themeId}-${group}`
  return unstable_cache(
    () =>
      prisma.themeSection.findMany({
        where: { themeId, group, enabled: true, productTemplateId: null },
        orderBy: { position: "asc" },
        include: {
          blocks: {
            where: { enabled: true },
            orderBy: { position: "asc" },
          },
        },
      }),
    [tag],
    { tags: [tag] },
  )
}

/**
 * Plan 19 — cached read of one product template's PRODUCT sections. Tagged
 * `theme-product-template-<templateId>` so editing a template invalidates
 * only that template's storefront read, not every product page.
 */
function buildCachedProductTemplateFetch(templateId: string) {
  const tag = `theme-product-template-${templateId}`
  return unstable_cache(
    () =>
      prisma.themeSection.findMany({
        where: {
          productTemplateId: templateId,
          enabled: true,
          // Belt-and-suspenders: template sections never carry productId.
          productId: null,
        },
        orderBy: { position: "asc" },
        include: {
          blocks: {
            where: { enabled: true },
            orderBy: { position: "asc" },
          },
        },
      }),
    [tag],
    { tags: [tag] },
  )
}

/**
 * Plan 19 (Fase 3) — cached read of a product's section overrides (detached
 * rows). Tagged `product-overrides-<productId>` so editing/detaching/
 * restoring a single product's section invalidates only that product, not
 * the shared template that N products render.
 */
function buildCachedProductOverridesFetch(productId: string) {
  const tag = `product-overrides-${productId}`
  return unstable_cache(
    () =>
      prisma.themeSection.findMany({
        where: { productId, detached: true, enabled: true },
        orderBy: { position: "asc" },
        include: {
          blocks: {
            where: { enabled: true },
            orderBy: { position: "asc" },
          },
        },
      }),
    [tag],
    { tags: [tag] },
  )
}

/**
 * Plan 19 (Fase 3) — merge a template's sections with a product's overrides.
 * An override keyed by `sourceSectionId` replaces the matching template
 * section in place; overrides with no source are pure-local sections
 * interleaved by position. Orphan overrides (source section deleted) are
 * dropped. Done OUTSIDE unstable_cache so editing one product's override
 * never invalidates the shared template read.
 */
function mergeOverrides(
  templateRows: SectionRowWithBlocks[],
  overrides: SectionRowWithBlocks[],
): SectionRowWithBlocks[] {
  const bySource = new Map<string, SectionRowWithBlocks>()
  const pureLocals: SectionRowWithBlocks[] = []
  for (const o of overrides) {
    if (o.sourceSectionId) bySource.set(o.sourceSectionId, o)
    else pureLocals.push(o)
  }
  const merged = templateRows.map((t) => bySource.get(t.id) ?? t)
  return [...merged, ...pureLocals].sort((a, b) => a.position - b.position)
}

/**
 * Plan 19 — cached lookup of a theme's default product template id. Tagged
 * `theme-default-product-template-<themeId>` so `setDefaultProductTemplate`
 * can invalidate it.
 */
function buildCachedDefaultTemplateFetch(themeId: string) {
  const tag = `theme-default-product-template-${themeId}`
  return unstable_cache(
    () =>
      prisma.themeProductTemplate.findFirst({
        where: { themeId, isDefault: true },
        select: { id: true },
      }),
    [tag],
    { tags: [tag] },
  )
}

/**
 * Resolve which product template a product page should render:
 * an explicitly-assigned template, else the theme's default. Returns null
 * only when a theme somehow has no default (pre-backfill / corrupt state).
 */
async function resolveProductTemplateId(
  themeId: string,
  opts?: { productId?: string; productTemplateId?: string | null },
): Promise<string | null> {
  // Explicit assignment passed by the caller (page.tsx already loads the
  // product, so it can hand us the id and skip a round-trip).
  if (opts?.productTemplateId) return opts.productTemplateId

  // Only fall back to a product lookup when we weren't given the id directly.
  if (opts?.productTemplateId === undefined && opts?.productId) {
    const product = await prisma.product.findUnique({
      where: { id: opts.productId },
      select: { themeProductTemplateId: true },
    })
    if (product?.themeProductTemplateId) return product.themeProductTemplateId
  }

  const fallback = await buildCachedDefaultTemplateFetch(themeId)()
  return fallback?.id ?? null
}

/**
 * Fetch the active (or preview) theme's sections in a group, ordered by
 * position, with sub-blocks included. Hidden (enabled=false) sections and
 * blocks are filtered out before reaching the renderer. The optional
 * `style` object on each content is device-flattened so renderers read
 * a single value per key (no DeviceValue<T> branching).
 *
 * Plan 19: for `group === "PRODUCT"`, pass `opts.productTemplateId` (or
 * `opts.productId`) to render the product's assigned template; omit both to
 * render the theme default.
 */
export async function getThemedSections(
  group: ThemeSectionGroup,
  device: Device = "desktop",
  opts?: { productId?: string; productTemplateId?: string | null },
): Promise<ResolvedThemeSection[]> {
  const theme = await resolveActiveTheme()
  if (!theme) return []

  let rows: SectionRowWithBlocks[]
  if (group === "PRODUCT") {
    const templateId = await resolveProductTemplateId(theme.id, opts)
    if (!templateId) return []
    const templateRows = await buildCachedProductTemplateFetch(templateId)()
    if (opts?.productId) {
      // Fase 3 — overlay this product's detached section overrides on top
      // of its template. Two independently-cached reads, merged in memory.
      const overrides = await buildCachedProductOverridesFetch(opts.productId)()
      rows = overrides.length ? mergeOverrides(templateRows, overrides) : templateRows
    } else {
      rows = templateRows
    }
  } else {
    rows = await buildCachedFetch(theme.id, group)()
  }

  return rows.map((row) => mapRowForDevice(row, device))
}

/** Shape a cached DB row into the device-flattened render contract. */
function mapRowForDevice(
  row: SectionRowWithBlocks,
  device: Device,
): ResolvedThemeSection {
  return {
    id: row.id,
    themeId: row.themeId,
    group: row.group,
    type: row.type,
    position: row.position,
    enabled: row.enabled,
    content: resolveContentForDevice(
      (row.content ?? {}) as ThemeSectionContent,
      device,
    ),
    blocks: row.blocks.map<ResolvedThemeSectionBlock>((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      position: b.position,
      enabled: b.enabled,
      content: resolveContentForDevice(
        (b.content ?? {}) as ThemeSectionContent,
        device,
      ),
    })),
  }
}

/**
 * Flatten DeviceValue<T> entries inside content.style for the given device.
 * Other top-level keys in content are passed through unchanged.
 *
 * Note: We can't directly reuse `resolveContentForDevice` from
 * `lib/blocks/resolve.ts` because that helper expects a full
 * `BlockContentV2` (data/style/media zones). Theme sections use a flatter
 * shape — schema-form fields at the top level plus an optional `style`
 * object. We do reuse `resolveForDevice` per field, however, to keep the
 * device-resolution logic in one place.
 */
function resolveContentForDevice(
  content: ThemeSectionContent,
  device: Device,
): ThemeSectionContent {
  if (!content.style) return content
  const flatStyle = flattenDeviceValues(
    content.style as Record<string, unknown>,
    device,
  )
  return { ...content, style: flatStyle as ThemeSectionContent["style"] }
}

function flattenDeviceValues(
  obj: Record<string, unknown>,
  device: Device,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      ("desktop" in (value as object) || "mobile" in (value as object))
    ) {
      const v = value as { desktop?: unknown; mobile?: unknown }
      out[key] =
        device === "mobile"
          ? (v.mobile ?? v.desktop)
          : (v.desktop ?? v.mobile)
    } else {
      out[key] = value
    }
  }
  return out
}
