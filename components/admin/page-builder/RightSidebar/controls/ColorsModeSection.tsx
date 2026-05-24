"use client"

import { cn } from "@/lib/utils"
import type { BlockStyle, DeviceValue } from "@/lib/blocks/types"
import { useColorSchemes } from "@/components/admin/customizer/color-schemes-context"
import { ColorControl } from "./ColorControl"
import { ColorSchemeControl } from "./ColorSchemeControl"

type ColorMode = "scheme" | "custom"

interface Props {
  colorMode: ColorMode | undefined
  colorSchemeId: string | undefined
  backgroundColor: DeviceValue<string> | undefined
  textColor: DeviceValue<string> | undefined
  /**
   * Whether the block's styleSupport allows custom background/text color
   * overrides. Theme sections pass `true` for both; page-builder blocks
   * derive these from the registry's styleSupport definition.
   */
  supportsBackground: boolean
  supportsText: boolean
  /**
   * Optional drawer/modal surface overrides. Opt-in via
   * `styleSupport.drawerColors` — currently only HEADER_MAIN sets this
   * to true so admins can recolor the mobile menu drawer independently
   * from the header itself.
   */
  drawerBgColor?: DeviceValue<string>
  drawerTextColor?: DeviceValue<string>
  supportsDrawerColors?: boolean
  /**
   * Patch applier. Caller merges into the persisted style and treats
   * `undefined` keys as deletions — see the patchStyle helpers in
   * StyleTab / ThemeSectionStyleTab.
   */
  onPatchStyle: (patch: Partial<BlockStyle>) => void
}

/**
 * Shopify-style unified "Colores" section. When the theme has 2+ color
 * schemes AND the block supports custom bg/text overrides, surfaces a
 * toggle:
 *   - Esquema del tema → pick a named scheme; bg/text overrides are
 *     cleared so the scheme's CSS variables actually win (inline styles
 *     would otherwise override the scheme).
 *   - Personalizado → raw bg/text per block; colorSchemeId is cleared so
 *     the two modes never visually compete.
 *
 * Mode is derived purely from props (no local useState) — the explicit
 * `colorMode` field on BlockStyle persists the admin's choice. This
 * matters because:
 *  - The admin can pick "Personalizado" without setting any color yet,
 *    and the toggle still remembers that choice on next visit.
 *  - In the customizer, ThemeSectionRightSidebar doesn't remount when
 *    switching between sections, so a local useState would leak the
 *    previous section's mode into the next one.
 *
 * When only one mode is available (no schemes, or the block doesn't
 * support custom colors), the toggle hides and that single mode renders
 * alone. Returns null when neither mode would render anything so the
 * "Colores" header doesn't appear empty.
 */
export function ColorsModeSection({
  colorMode,
  colorSchemeId,
  backgroundColor,
  textColor,
  supportsBackground,
  supportsText,
  drawerBgColor,
  drawerTextColor,
  supportsDrawerColors = false,
  onPatchStyle,
}: Props) {
  const schemes = useColorSchemes()
  const hasMultipleSchemes = schemes.length >= 2
  const hasCustomFields =
    supportsBackground || supportsText || supportsDrawerColors

  if (!hasMultipleSchemes && !hasCustomFields) return null

  const showToggle = hasMultipleSchemes && hasCustomFields
  // Resolve the effective mode for this render. Force the only-available
  // mode if the other one isn't even an option (e.g. theme dropped to one
  // scheme after a block was set to "scheme").
  const effectiveMode: ColorMode = !hasMultipleSchemes
    ? "custom"
    : !hasCustomFields
      ? "scheme"
      : resolveMode({
          colorMode,
          colorSchemeId,
          backgroundColor,
          textColor,
          hasMultipleSchemes,
        })

  function switchMode(next: ColorMode) {
    if (next === effectiveMode) return
    if (next === "scheme") {
      // Custom colors win over schemes via inline style; clearing them
      // ensures the freshly-picked scheme is actually visible. Also
      // persist the explicit mode so it survives section switches and
      // page reloads.
      onPatchStyle({
        colorMode: "scheme",
        backgroundColor: undefined,
        textColor: undefined,
        drawerBgColor: undefined,
        drawerTextColor: undefined,
      })
    } else {
      onPatchStyle({
        colorMode: "custom",
        colorSchemeId: undefined,
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
        Colores
      </div>
      <div className="space-y-3">
        {showToggle && (
          <ModeToggle mode={effectiveMode} onChange={switchMode} />
        )}

        {effectiveMode === "scheme" ? (
          <ColorSchemeControl
            value={colorSchemeId}
            onChange={(v) => onPatchStyle({ colorSchemeId: v })}
          />
        ) : (
          <>
            {supportsBackground && (
              <ColorControl
                label="Fondo"
                value={backgroundColor}
                onChange={(v) => onPatchStyle({ backgroundColor: v })}
              />
            )}
            {supportsText && (
              <ColorControl
                label="Texto"
                value={textColor}
                onChange={(v) => onPatchStyle({ textColor: v })}
              />
            )}
            {supportsDrawerColors && (
              <>
                <div className="border-t pt-3 mt-1">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">
                    Menú móvil (drawer)
                  </p>
                  <div className="space-y-3">
                    <ColorControl
                      label="Fondo del drawer"
                      value={drawerBgColor}
                      onChange={(v) => onPatchStyle({ drawerBgColor: v })}
                    />
                    <ColorControl
                      label="Texto del drawer"
                      value={drawerTextColor}
                      onChange={(v) => onPatchStyle({ drawerTextColor: v })}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Resolve the active mode purely from data. Explicit `colorMode` always
 * wins. The fallback heuristic exists for blocks that pre-date this
 * field (no migration; they get inferred mode based on which color
 * fields actually have values).
 */
function resolveMode({
  colorMode,
  colorSchemeId,
  backgroundColor,
  textColor,
  hasMultipleSchemes,
}: {
  colorMode: ColorMode | undefined
  colorSchemeId: string | undefined
  backgroundColor: DeviceValue<string> | undefined
  textColor: DeviceValue<string> | undefined
  hasMultipleSchemes: boolean
}): ColorMode {
  if (colorMode === "scheme" || colorMode === "custom") return colorMode
  if (colorSchemeId) return "scheme"
  if (backgroundColor !== undefined || textColor !== undefined) {
    return "custom"
  }
  return hasMultipleSchemes ? "scheme" : "custom"
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ColorMode
  onChange: (next: ColorMode) => void
}) {
  return (
    <div className="inline-flex w-full rounded-md border bg-background p-0.5">
      <ModeButton
        active={mode === "scheme"}
        onClick={() => onChange("scheme")}
        label="Esquema del tema"
      />
      <ModeButton
        active={mode === "custom"}
        onClick={() => onChange("custom")}
        label="Personalizado"
      />
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 px-2.5 py-1 text-xs font-medium rounded transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}
