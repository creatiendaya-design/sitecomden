"use client"

import { useBuilderStore } from "../../store"
import type { BlockStyle, DeviceValue } from "@/lib/blocks/types"
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

  return (
    <div className="space-y-6">
      <Section title="Colores">
        <ColorControl
          label="Fondo"
          value={style.backgroundColor as DeviceValue<string> | undefined}
          onChange={(v) => patchStyle("backgroundColor", v)}
        />
        <ColorControl
          label="Texto"
          value={style.textColor as DeviceValue<string> | undefined}
          onChange={(v) => patchStyle("textColor", v)}
        />
      </Section>

      <Section title="Espaciado">
        <PaddingControl
          value={style.paddingY}
          onChange={(v) => patchStyle("paddingY", v)}
        />
      </Section>

      <Section title="Layout">
        <AlignmentControl
          value={style.alignment}
          onChange={(v) => patchStyle("alignment", v)}
        />
        <ContainerWidthControl
          value={style.containerWidth}
          onChange={(v) => patchStyle("containerWidth", v)}
        />
      </Section>

      <Section title="Bordes y sombras">
        <CornerRadiusControl
          value={style.cornerRadius}
          onChange={(v) => patchStyle("cornerRadius", v)}
        />
        <BorderControl
          value={style.border}
          onChange={(v) => patchStyle("border", v)}
        />
        <ShadowControl
          value={style.shadow}
          onChange={(v) => patchStyle("shadow", v)}
        />
      </Section>

      <Section title="Visibilidad">
        <VisibilityControl
          value={style.visibility}
          onChange={(v) => patchStyle("visibility", v)}
        />
      </Section>

      <Section title="Imagen de fondo">
        <ImageControl
          label="Background"
          value={content.media?.bgImage}
          onChange={(v) => patchMedia("bgImage", v)}
        />
      </Section>
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
