"use client"

import { useBuilderStore } from "../../store"
import type { BlockStyle, DeviceValue } from "@/lib/blocks/types"
import { resolveStyleSupport } from "@/lib/blocks/types"
import { getBlockDefinition } from "@/lib/blocks/registry"
import { ColorControl } from "../controls/ColorControl"
import { PaddingControl } from "../controls/PaddingControl"
import { AlignmentControl } from "../controls/AlignmentControl"
import { ContainerWidthControl } from "../controls/ContainerWidthControl"
import { CornerRadiusControl } from "../controls/CornerRadiusControl"
import { BorderControl } from "../controls/BorderControl"
import { ShadowControl } from "../controls/ShadowControl"
import { VisibilityControl } from "../controls/VisibilityControl"
import { ImageControl } from "../controls/ImageControl"

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
    showColors || support.padding || showLayout || showBorders || support.visibility || support.bgImage
  if (!anything) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Este bloque no tiene opciones de estilo configurables.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showColors && (
        <Section title="Colores">
          {support.backgroundColor && (
            <ColorControl
              label="Fondo"
              value={style.backgroundColor as DeviceValue<string> | undefined}
              onChange={(v) => patchStyle("backgroundColor", v)}
            />
          )}
          {support.textColor && (
            <ColorControl
              label="Texto"
              value={style.textColor as DeviceValue<string> | undefined}
              onChange={(v) => patchStyle("textColor", v)}
            />
          )}
        </Section>
      )}

      {support.padding && (
        <Section title="Espaciado">
          <PaddingControl
            value={style.paddingY}
            onChange={(v) => patchStyle("paddingY", v)}
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
