import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import { resolveActiveTheme } from "@/lib/themes/resolve-active-theme"
import type { Device } from "@/lib/blocks/types"
import type { ThemeSectionGroup } from "@prisma/client"
import type {
  ResolvedThemeSection,
  ResolvedThemeSectionBlock,
  ThemeSectionContent,
} from "./types"

/**
 * Plan 16 perf: per-(theme, group) cached read of the section rows. Tagged
 * `theme-sections-<themeId>-<group>` so save actions can invalidate
 * precisely without nuking the storefront layout's site-settings / pixels
 * / theme-meta caches. Device flattening happens AFTER the cache hit
 * because it's a CPU-only transform of the cached rows.
 */
function buildCachedFetch(themeId: string, group: ThemeSectionGroup) {
  const tag = `theme-sections-${themeId}-${group}`
  return unstable_cache(
    () =>
      prisma.themeSection.findMany({
        where: { themeId, group, enabled: true },
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
 * Fetch the active (or preview) theme's sections in a group, ordered by
 * position, with sub-blocks included. Hidden (enabled=false) sections and
 * blocks are filtered out before reaching the renderer. The optional
 * `style` object on each content is device-flattened so renderers read
 * a single value per key (no DeviceValue<T> branching).
 */
export async function getThemedSections(
  group: ThemeSectionGroup,
  device: Device = "desktop",
): Promise<ResolvedThemeSection[]> {
  const theme = await resolveActiveTheme()
  if (!theme) return []

  const fetchRows = buildCachedFetch(theme.id, group)
  const rows = await fetchRows()

  return rows.map((row) => ({
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
  }))
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
