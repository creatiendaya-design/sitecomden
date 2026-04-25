"use client"

import { useBuilderStore } from "../../store"
import { ImageControl } from "../../RightSidebar/controls/ImageControl"

/**
 * Custom escape-hatch field used by IMAGE_TEXT block. Its image lives in
 * content.media.image (not content.data), so it bypasses the SchemaForm's
 * data flow and edits the store directly.
 */
export function ImageTextMediaField() {
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId)
  const blocks = useBuilderStore((s) => s.blocks)
  const updateBlockContent = useBuilderStore((s) => s.updateBlockContent)
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
