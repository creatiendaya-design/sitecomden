"use client"

import dynamic from "next/dynamic"
import type { BlockContentV2 } from "@/lib/blocks/types"

const RichTextEditor = dynamic(
  () => import("@/components/admin/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-muted rounded" /> }
)

interface Props {
  content: BlockContentV2
  onChange: (content: BlockContentV2) => void
}

export function RichTextContentForm({ content, onChange }: Props) {
  const html = (content.data.html as string) ?? ""

  return (
    <div>
      <RichTextEditor
        content={html}
        onChange={(newHtml: string) =>
          onChange({
            ...content,
            data: { ...content.data, html: newHtml },
          })
        }
      />
    </div>
  )
}
