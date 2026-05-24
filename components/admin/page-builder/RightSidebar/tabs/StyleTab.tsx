"use client"

import { useBuilderStore } from "../../store"
import type { BlockStyle, DeviceValue } from "@/lib/blocks/types"
import { resolveStyleSupport } from "@/lib/blocks/types"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { PaddingControl } from "../controls/PaddingControl"
import { PaddingTopBottomControl } from "../controls/PaddingTopBottomControl"
import { TypographyControl } from "../controls/TypographyControl"
import { GradientControl } from "../controls/GradientControl"
import { AlignmentControl } from "../controls/AlignmentControl"
import { ContainerWidthControl } from "../controls/ContainerWidthControl"
import { CornerRadiusControl } from "../controls/CornerRadiusControl"
import { BorderControl } from "../controls/BorderControl"
import { ShadowControl } from "../controls/ShadowControl"
import { VisibilityControl } from "../controls/VisibilityControl"
import { ImageControl } from "../controls/ImageControl"
import { ColorsModeSection } from "../controls/ColorsModeSection"

export function StyleTab() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null

  const def = getBlockDefinition(block.type)
  const support = resolveStyleSupport(def?.styleSupport)

  const content = block.content
  const style = content.style ?? {}

  function patchStyle<K extends keyof BlockStyle>(key: K, value: BlockStyle[K] | undefined) {
    updateBlockContent(block!.id, {
      ...content,
      style: { ...style, [key]: value } as BlockStyle,
    })
  }

  // Multi-key patch with delete-on-undefined semantics. Used by the
  // unified Colors section, which clears the inactive mode's keys
  // (colorSchemeId vs backgroundColor/textColor) when the admin toggles
  // between Esquema and Personalizado.
  function patchStyleMulti(patch: Partial<BlockStyle>) {
    const next: BlockStyle = { ...style, ...patch }
    for (const key of Object.keys(patch) as (keyof BlockStyle)[]) {
      if (patch[key] === undefined) {
        delete next[key]
      }
    }
    updateBlockContent(block!.id, { ...content, style: next })
  }

  // First admin interaction with the new top/bottom controls drops the legacy
  // `paddingY` so the new fields become the source of truth.
  function patchStyleMigratePadding(patch: Partial<BlockStyle>) {
    const next: BlockStyle = { ...style, ...patch }
    if ((patch.paddingTop !== undefined || patch.paddingBottom !== undefined) && next.paddingY) {
      delete next.paddingY
    }
    updateBlockContent(block!.id, { ...content, style: next })
  }

  function patchMedia(key: "bgImage", value: { desktop?: string; mobile?: string } | undefined) {
    updateBlockContent(block!.id, {
      ...content,
      media: { ...content.media, [key]: value },
    })
  }

  // Section-level visibility
  const showColors = support.backgroundColor || support.textColor
  const showLayout = support.alignment || support.containerWidth
  const showBorders = support.cornerRadius || support.border || support.shadow

  // If nothing is supported (shouldn't happen, but guard)
  const anything =
    showColors ||
    support.padding ||
    showLayout ||
    showBorders ||
    support.visibility ||
    support.bgImage ||
    support.typography ||
    support.gradient
  if (!anything) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Este bloque no tiene opciones de estilo configurables.
      </div>
    )
  }

  return (
    // `key={block.id}` mirrors ContentTab — remounts every control when
    // the admin switches blocks so the debounced color inputs flush any
    // pending value to the correct (old) block on unmount.
    <div key={block.id} className="space-y-6">
      {/* Unified Colores section: when the theme has 2+ schemes AND the
          block supports custom bg/text, the user gets a Shopify-style
          toggle (Esquema del tema / Personalizado). Choosing one mode
          clears the other's keys so the two never visually compete. */}
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

      {support.gradient && (
        <Section title="Gradiente">
          <GradientControl
            value={style.backgroundGradient}
            onChange={(v) => patchStyle("backgroundGradient", v)}
          />
        </Section>
      )}

      {support.padding && (
        <Section title="Espaciado">
          {support.paddingTopBottom ? (
            <PaddingTopBottomControl
              topValue={style.paddingTop ?? style.paddingY}
              bottomValue={style.paddingBottom ?? style.paddingY}
              onTopChange={(v) => patchStyleMigratePadding({ paddingTop: v })}
              onBottomChange={(v) => patchStyleMigratePadding({ paddingBottom: v })}
            />
          ) : (
            <PaddingControl
              value={style.paddingY}
              onChange={(v) => patchStyle("paddingY", v)}
            />
          )}
        </Section>
      )}

      {support.typography && (
        <Section title="Tipografía">
          <TypographyControl
            size={style.textSize}
            weight={style.textWeight}
            onSizeChange={(v) => patchStyle("textSize", v)}
            onWeightChange={(v) => patchStyle("textWeight", v)}
          />
        </Section>
      )}

      {showLayout && (
        <Section title="Layout">
          {support.alignment && (
            <AlignmentControl
              value={style.alignment}
              onChange={(v) => patchStyle("alignment", v)}
            />
          )}
          {support.containerWidth && (
            <ContainerWidthControl
              value={style.containerWidth}
              onChange={(v) => patchStyle("containerWidth", v)}
            />
          )}
        </Section>
      )}

      {showBorders && (
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

      {support.visibility && (
        <Section title="Visibilidad">
          <VisibilityControl
            value={style.visibility}
            onChange={(v) => patchStyle("visibility", v)}
          />
        </Section>
      )}

      {support.bgImage && (
        <Section title="Imagen de fondo">
          <ImageControl
            label="Background"
            value={content.media?.bgImage}
            onChange={(v) => patchMedia("bgImage", v)}
          />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b pb-1">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
