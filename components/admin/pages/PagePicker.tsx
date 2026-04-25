"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderOpen } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listPages, type PageRow } from "@/actions/pages"

interface PagePickerProps {
  currentPageId: string
}

export function PagePicker({ currentPageId }: PagePickerProps) {
  const router = useRouter()
  const [pages, setPages] = useState<PageRow[]>([])

  useEffect(() => {
    listPages()
      .then((rows) => setPages(rows.filter((p) => p.active)))
      .catch(() => {})
  }, [])

  function handleChange(value: string) {
    if (value === "__list__") {
      router.push("/admin/paginas")
      return
    }
    if (value === currentPageId) return
    router.push(`/admin/paginas/${value}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Editando</Label>
      <Select value={currentPageId} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-[220px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {pages.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="__list__">
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen className="h-3 w-3" />
              Ver todas
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
