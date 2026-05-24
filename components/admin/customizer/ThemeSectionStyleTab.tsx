"use client"

import type {
  BlockStyle,
  BlockStyleSupport,
  DeviceValue,
} from "@/lib/blocks/types"
import { resolveStyleSupport } from "@/lib/blocks/types"
import { ColorsModeSection } from "@/components/admin/page-builder/RightSidebar/controls/ColorsModeSection"
import { PaddingTopBottomControl } from "@/components/admin/page-builder/RightSidebar/controls/PaddingTopBottomControl"
import { BorderControl } from "@/components/admin/page-builder/RightSidebar/controls/BorderControl"
import { CornerRadiusControl } from "@/components/admin/page-builder/RightSidebar/controls/CornerRadiusControl"
import { ShadowControl } from "@/components/admin/page-builder/RightSidebar/controls/ShadowControl"
import { AlignmentControl } from "@/components/admin/page-builder/RightSidebar/controls/AlignmentControl"

interface ThemeSectionStyleTabProps {
  content: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  /** From the section/sub-block registry definition. Omitted fields fall
   *  back to `true` so legacy definitions render the full Estilo tab. */
  styleSupport?: Partial<BlockStyleSupport>
}

/**
 * Style editor shared by theme-section and section-block targets in the
 * customizer's right sidebar. Mirrors the page-builder StyleTab, but the
 * page-builder version reads from useBuilderStore — theme sections live in
 * their own Zustand store (theme-sections-store), so we drive this tab via
 * props instead and let the caller wire the persistence.
 *
 * Color editing is delegated to the shared ColorsModeSection. Other style
 * sections are conditionally rendered based on the section's registry
 * `styleSupport` flags — headers opt out of alignment / border / shadow /
 * corner-radius because they're full-width sticky bars where those
 * controls don't produce a sensible visual effect.
 */
export function ThemeSectionStyleTab({
  content,
  onChange,
  styleSupport,
}: ThemeSectionStyleTabProps) {
  const style = (content.style as BlockStyle | undefined) ?? {}
  const support = resolveStyleSupport(styleSupport)

  function patchStyle<K extends keyof BlockStyle>(
    key: K,
    value: BlockStyle[K] | undefined,
  ) {
    const nextStyle: BlockStyle = { ...style, [key]: value }
    if (value === undefined) {
      delete nextStyle[key]
    }
    onChange({ ...content, style: nextStyle })
  }

  // Multi-key patch with delete-on-undefined — used by ColorsModeSection
  // when it clears the inactive color mode's keys.
  function patchStyleMulti(patch: Partial<BlockStyle>) {
    const next: BlockStyle = { ...style, ...patch }
    for (const key of Object.keys(patch) as (keyof BlockStyle)[]) {
      if (patch[key] === undefined) {
        delete next[key]
      }
    }
    onChange({ ...content, style: next })
  }

  function patchStyleMigratePadding(patch: Partial<BlockStyle>) {
    const next: BlockStyle = { ...style, ...patch }
    if (
      (patch.paddingTop !== undefined || patch.paddingBottom !== undefined) &&
      next.paddingY
    ) {
      delete next.paddingY
    }
    onChange({ ...content, style: next })
  }

  const showBordersAndShadow =
    support.cornerRadius || support.border || support.shadow

  return (
    <div className="space-y-6">
      <ColorsModeSection
        colorMode={style.colorMode}
        colorSchemeId={style.colorSchemeId}
        backgroundColor={style.backgroundColor as DeviceValue<string> | undefined}
        textColor={style.textColor as DeviceValue<string> | undefined}
        supportsBackground={support.backgroundColor}
        supportsText={support.textColor}
        drawerBgColor={style.drawerBgColor as DeviceValue<string> | undefined}
        drawerTextColor={style.drawerTextColor as DeviceValue<string> | undefined}
        supportsDrawerColors={support.drawerColors}
        onPatchStyle={patchStyleMulti}
      />

      {support.padding && (
        <Section title="Espaciado">
          <PaddingTopBottomControl
            topValue={style.paddingTop ?? style.paddingY}
            bottomValue={style.paddingBottom ?? style.paddingY}
            onTopChange={(v) => patchStyleMigratePadding({ paddingTop: v })}
            onBottomChange={(v) =>
              patchStyleMigratePadding({ paddingBottom: v })
            }
          />
        </Section>
      )}

      {support.alignment && (
        <Section title="Layout">
          <AlignmentControl
            value={style.alignment}
            onChange={(v) => patchStyle("alignment", v)}
          />
        </Section>
      )}

      {showBordersAndShadow && (
        <Section title="Bordes y sombras">
          {support.cornerRadius && (
            <CornerRadiusControl
              value={style.cornerRadius}
              onChange={(v) => patchStyle("cornerRadius", v)}
            />
          )}
          {support.border && (
            <BorderControl
              value={style.border}
              onChange={(v) => patchStyle("border", v)}
            />
          )}
          {support.shadow && (
            <ShadowControl
              value={style.shadow}
              onChange={(v) => patchStyle("shadow", v)}
            />
          )}
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
