"use client"

import dynamic from "next/dynamic"
import type { BlockContentV2 } from "@/lib/blocks/types"

const ColorsBlockForm = dynamic(
  () => import("@/components/admin/landing-builder/block-forms/ColorsBlockForm"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
)

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function ColorsContentForm({ content, onChange }: Props) {
  return (
    <ColorsBlockForm
      content={content.data as any}
      onChange={(newData: any) =>
        onChange({
          data: newData,
          style: content.style,
          media: content.media,
        })
      }
    />
  )
}
