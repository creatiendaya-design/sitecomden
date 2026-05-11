"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Star, Copy, Trash2, Plus, MessageCircle, ExternalLink, Inbox } from "lucide-react"
import { toast } from "sonner"
import {
  createTemplate,
  duplicateTemplate,
  deleteTemplate,
} from "@/actions/cod-form-templates"
import type { PostSubmitAction } from "@/lib/cod-forms/types"

type Row = {
  id: string
  name: string
  isDefault: boolean
  postSubmitAction: PostSubmitAction
  productCount: number
  updatedAt: Date
}

const ACTION_LABEL: Record<PostSubmitAction, string> = {
  INLINE_THANK_YOU: "Mensaje en pantalla",
  WHATSAPP_REDIRECT: "WhatsApp",
  THANK_YOU_PAGE: "Página de agradecimiento",
}

const ACTION_ICON: Record<PostSubmitAction, typeof Inbox> = {
  INLINE_THANK_YOU: Inbox,
  WHATSAPP_REDIRECT: MessageCircle,
  THANK_YOU_PAGE: ExternalLink,
}

export default function CodFormTemplatesList({ templates }: { templates: Row[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")

  const onCreate = () => {
    startTransition(async () => {
      try {
        const { id } = await createTemplate(newName)
        toast.success("Plantilla creada")
        setCreating(false)
        setNewName("")
        router.push(`/admin/formularios-cod/${id}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al crear")
      }
    })
  }

  const onDuplicate = (id: string) => {
    startTransition(async () => {
      try {
        const { id: newId } = await duplicateTemplate(id)
        toast.success("Plantilla duplicada")
        router.push(`/admin/formularios-cod/${newId}`)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al duplicar")
      }
    })
  }

  const onDelete = (id: string, name: string) => {
    if (!confirm(`Eliminar la plantilla "${name}"? Sus productos se reasignarán a Default.`)) return
    startTransition(async () => {
      try {
        await deleteTemplate(id)
        toast.success("Plantilla eliminada")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al eliminar")
      }
    })
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Formularios COD</h1>
          <p className="text-sm text-muted-foreground">
            Plantillas reutilizables del formulario de Pago Contra Entrega.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={pending}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva plantilla
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Nombre</th>
              <th className="text-left px-4 py-2 font-medium">Acción al confirmar</th>
              <th className="text-left px-4 py-2 font-medium">Productos</th>
              <th className="text-right px-4 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const Icon = ACTION_ICON[t.postSubmitAction]
              return (
                <tr key={t.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/formularios-cod/${t.id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      {t.isDefault && <Star className="h-4 w-4 text-amber-500 fill-current" />}
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {ACTION_LABEL[t.postSubmitAction]}
                    </span>
                  </td>
                  <td className="px-4 py-2">{t.productCount}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(t.id)}
                      disabled={pending}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(t.id, t.name)}
                      disabled={pending || t.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}
            {templates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No hay plantillas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla COD</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nombre de la plantilla"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={pending}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={onCreate} disabled={pending || !newName.trim()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
