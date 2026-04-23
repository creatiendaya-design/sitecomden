"use client"

import dynamic from "next/dynamic"
import type { BlockContentV2 } from "@/lib/blocks/types"

const TestimonialsBlockForm = dynamic(
  () => import("@/components/admin/landing-builder/block-forms/TestimonialsBlockForm"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
)

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function TestimonialsContentForm({ content, onChange }: Props) {
  return (
    <TestimonialsBlockForm
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
