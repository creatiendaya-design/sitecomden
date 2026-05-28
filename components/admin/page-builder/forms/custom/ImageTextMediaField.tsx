"use client"

import { useBuilderStore } from "../../store"
import { ImageControl } from "../../RightSidebar/controls/ImageControl"
import { useBlockEditingContext } from "./block-editing-context"

/**
 * Custom escape-hatch field used by IMAGE_TEXT and PORCENTAJE_UNO blocks.
 * Their image lives in content.media.image (not content.data), so it
 * bypasses the SchemaForm's data flow and edits the surrounding store
 * directly.
 *
 * Two store paths:
 *  - When mounted inside a `BlockEditingProvider` (theme-section
 *    LEGACY_BLOCK adapter), the field reads/writes through context.
 *  - Otherwise (default page-builder editor), it falls back to
 *    `useBuilderStore` and the selected block id.
 */
export function ImageTextMediaField() {
  const ctx = useBlockEditingContext()
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)

  if (ctx) {
    const { content, onContentChange } = ctx
    return (
      <ImageControl
        label="Imagen"
        value={content.media?.image}
        onChange={(v) =>
          onContentChange({
            ...content,
            media: { ...content.media, image: v },
          })
        }
      />
    )
  }

  const block = blocks.find((b) => b.id === selectedBlockId)
  if (!block) return null
  return (
    <ImageControl
      label="Imagen"
      value={block.content.media?.image}
      onChange={(v) =>
        updateBlockContent(block.id, {
          ...block.content,
          media: { ...block.content.media, image: v },
        })
      }
    />
  )
}
