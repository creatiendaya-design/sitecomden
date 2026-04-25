"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderOpen, Plus } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listLandingTemplates, type TemplateRow } from "@/actions/landing-templates"
import { CreateTemplateDialog } from "./CreateTemplateDialog"
import { toast } from "sonner"

interface Props {
  currentTemplateId: string
}

/**
 * Topbar dropdown for the template editor. Lets the admin switch between
 * templates without leaving the page builder, plus shortcuts to create a
 * new template inline or jump to the library.
 */
export function TemplatePicker({ currentTemplateId }: Props) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    listLandingTemplates({ active: true })
      .then(setTemplates)
      .catch(() => {})
  }, [])

  const handleChange = (value: string) => {
    if (value === "__create__") {
      setShowCreate(true)
      return
    }
    if (value === "__library__") {
      router.push("/admin/landing-plantillas/biblioteca")
      return
    }
    if (value === currentTemplateId) return
    router.push(`/admin/landing-plantillas/${value}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Editando</Label>
      <Select value={currentTemplateId} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-xs w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="__create__" className="text-primary">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              Crear plantilla
            </span>
          </SelectItem>
          <SelectItem value="__library__">
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen className="h-3 w-3" />
              Ver biblioteca
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <CreateTemplateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(id) => {
          setShowCreate(false)
          toast.success("Plantilla creada")
          router.push(`/admin/landing-plantillas/${id}`)
        }}
      />
    </div>
  )
}
