// components/shop/cod-form/blocks/HeaderBlock.tsx
"use client"

import type { HeaderContent } from "@/lib/cod-forms/types"

export default function HeaderBlock({ content }: { content: HeaderContent }) {
  return (
    <div
      style={{
        textAlign: content.align,
        fontSize: `${content.fontSize}px`,
        fontWeight: content.fontWeight,
        fontStyle: content.fontStyle,
        color: content.color,
      }}
    >
      {content.text}
    </div>
  )
}
