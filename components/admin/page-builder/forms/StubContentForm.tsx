"use client"

import type { BlockContentV2 } from "@/lib/blocks/types"

interface StubContentFormProps {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
  blockType: string
}

/**
 * Temporary placeholder content form used while the block registry is being
 * wired up. Replaced in Task 20 with adapters over the existing legacy forms
 * in components/admin/landing-builder/block-forms/.
 */
export function StubContentForm({ blockType }: StubContentFormProps) {
  return (
    <div className="p-4 text-sm text-muted-foreground bg-muted rounded-md">
      <p className="font-medium mb-1">Content form for {blockType}</p>
      <p>Placeholder — real form wired up in Task 20.</p>
    </div>
  )
}
