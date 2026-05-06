"use client"

type PageOpt = { id: string; slug: string; title: string }

export default function EditorToolbar(_: { pages: PageOpt[] }) {
  return <div className="border-b p-2">Toolbar (stub)</div>
}
