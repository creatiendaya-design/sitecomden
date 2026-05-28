"use client"

import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getBlockDefinition } from "@/lib/blocks/registry"
import {
  resolveStyleSupport,
  type BlockContentV2,
  type BlockMedia,
  type BlockStyle,
  type DeviceValue,
  type LandingBlockType,
} from "@/lib/blocks/types"
import { SchemaForm } from "@/components/admin/page-builder/forms/SchemaForm"
import { BlockEditingProvider } from "@/components/admin/page-builder/forms/custom/block-editing-context"
import { PaddingControl } from "@/components/admin/page-builder/RightSidebar/controls/PaddingControl"
import { PaddingTopBottomControl } from "@/components/admin/page-builder/RightSidebar/controls/PaddingTopBottomControl"
import { TypographyControl } from "@/components/admin/page-builder/RightSidebar/controls/TypographyControl"
import { GradientControl } from "@/components/admin/page-builder/RightSidebar/controls/GradientControl"
import { AlignmentControl } from "@/components/admin/page-builder/RightSidebar/controls/AlignmentControl"
import { ContainerWidthControl } from "@/components/admin/page-builder/RightSidebar/controls/ContainerWidthControl"
import { CornerRadiusControl } from "@/components/admin/page-builder/RightSidebar/controls/CornerRadiusControl"
import { BorderControl } from "@/components/admin/page-builder/RightSidebar/controls/BorderControl"
import { ShadowControl } from "@/components/admin/page-builder/RightSidebar/controls/ShadowControl"
import { VisibilityControl } from "@/components/admin/page-builder/RightSidebar/controls/VisibilityControl"
import { ImageControl } from "@/components/admin/page-builder/RightSidebar/controls/ImageControl"
import { ColorsModeSection } from "@/components/admin/page-builder/RightSidebar/controls/ColorsModeSection"

interface Props {
  /** Whole LEGACY_BLOCK section content:
   *  `{ blockType, data, style, media }` — `blockType` selects which
   *  BlockDefinition to bind the form against; the rest mirrors the
   *  BlockContentV2 zones the page-builder uses. */
  content: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

/**
 * RightSidebar variant for LEGACY_BLOCK theme sections. Delegates the
 * Content tab to the wrapped block's `contentSchema` and the Style tab
 * to the same set of controls the page-builder's StyleTab uses — so the
 * editing UX is byte-identical whether the admin is editing the block
 * inside a per-product landing or inside a PRODUCT-group theme section.
 *
 * Mirrors `StyleTab.tsx` and `ContentTab.tsx`, but reads from props
 * instead of useBuilderStore so the same controls compose cleanly with
 * the theme-sections store. The two files were intentionally not
 * refactored to a shared component — they're 100 LOC apart and any
 * shared abstraction would force both surfaces to evolve in lockstep.
 */
export function LegacyBlockEditor({ content, onChange }: Props) {
  const blockType = content.blockType as LandingBlockType | undefined
  const def = blockType ? getBlockDefinition(blockType) : undefined

  const data = useMemo(
    () => (content.data as Record<string, unknown>) ?? {},
    [content.data],
  )
  const style = useMemo(
    () => (content.style as BlockStyle) ?? {},
    [content.style],
  )
  const media = useMemo(
    () => (content.media as BlockMedia) ?? {},
    [content.media],
  )

  // Reassemble the inner BlockContentV2 shape for any custom-field that
  // bypasses the SchemaForm value flow (currently ImageTextMediaField,
  // which writes to `media.image`). The provider lets such fields read
  // and write the LEGACY_BLOCK's content without reaching for the
  // page-builder Zustand store — see `block-editing-context.tsx`.
  const innerContent: BlockContentV2 = useMemo(
    () => ({ data, style, media }),
    [data, style, media],
  )
  const handleInnerContentChange = (next: BlockContentV2) => {
    onChange({
      ...content,
      data: next.data,
      style: next.style,
      media: next.media,
    })
  }

  if (!def) {
    return (
      <div className="p-4 text-xs text-destructive">
        No se encontró el bloque del tipo {String(blockType)}.
      </div>
    )
  }

  const support = resolveStyleSupport(def.styleSupport)
  const blockColorFields = (def.contentSchema ?? []).filter(
    (f) => f.showInStyleTab,
  )
  const contentOnlySchema = (def.contentSchema ?? []).filter(
    (f) => !f.showInStyleTab,
  )

  function patchData(nextData: Record<string, unknown>) {
    onChange({ ...content, data: nextData })
  }

  function patchStyle<K extends keyof BlockStyle>(
    key: K,
    value: BlockStyle[K] | undefined,
  ) {
    onChange({ ...content, style: { ...style, [key]: value } })
  }

  function patchStyleMulti(patch: Partial<BlockStyle>) {
    const next: BlockStyle = { ...style, ...patch }
    for (const key of Object.keys(patch) as (keyof BlockStyle)[]) {
      if (patch[key] === undefined) delete next[key]
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

  function patchMedia(
    key: "bgImage",
    value: { desktop?: string; mobile?: string } | undefined,
  ) {
    onChange({ ...content, media: { ...media, [key]: value } })
  }

  const hasContentForm = contentOnlySchema.length > 0

  const showColors = support.backgroundColor || support.textColor
  const showLayout = support.alignment || support.containerWidth
  const showBorders = support.cornerRadius || support.border || support.shadow

  return (
    <BlockEditingProvider
      value={{
        content: innerContent,
        onContentChange: handleInnerContentChange,
      }}
    >
    <Tabs
      defaultValue={hasContentForm ? "content" : "style"}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <TabsList className="mx-3 mt-2 shrink-0">
        <TabsTrigger value="content" className="flex-1">
          Contenido
        </TabsTrigger>
        <TabsTrigger value="style" className="flex-1">
          Estilo
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="content"
        className="flex-1 overflow-auto p-3 mt-0 space-y-3"
      >
        {def.description && (
          <p className="text-xs text-muted-foreground leading-relaxed border-l-2 pl-2">
            {def.description}
          </p>
        )}
        {hasContentForm ? (
          <SchemaForm
            schema={contentOnlySchema}
            value={data}
            onChange={patchData}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Todos los campos de este bloque están en la pestaña Estilo.
          </p>
        )}
      </TabsContent>

      <TabsContent
        value="style"
        className="flex-1 overflow-auto p-3 mt-0 space-y-6"
      >
        {showColors && (
          <ColorsModeSection
            colorMode={style.colorMode}
            colorSchemeId={style.colorSchemeId}
            backgroundColor={
              style.backgroundColor as DeviceValue<string> | undefined
            }
            textColor={style.textColor as DeviceValue<string> | undefined}
            supportsBackground={support.backgroundColor}
            supportsText={support.textColor}
            drawerBgColor={
              style.drawerBgColor as DeviceValue<string> | undefined
            }
            drawerTextColor={
              style.drawerTextColor as DeviceValue<string> | undefined
            }
            supportsDrawerColors={support.drawerColors}
            onPatchStyle={patchStyleMulti}
          />
        )}

        {blockColorFields.length > 0 && (
          <Section title="Colores del bloque">
            <SchemaForm
              schema={blockColorFields}
              value={data}
              onChange={patchData}
            />
          </Section>
        )}

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
                onTopChange={(v) =>
                  patchStyleMigratePadding({ paddingTop: v })
                }
                onBottomChange={(v) =>
                  patchStyleMigratePadding({ paddingBottom: v })
                }
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
              value={media.bgImage}
              onChange={(v) => patchMedia("bgImage", v)}
            />
          </Section>
        )}
      </TabsContent>
    </Tabs>
    </BlockEditingProvider>
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
