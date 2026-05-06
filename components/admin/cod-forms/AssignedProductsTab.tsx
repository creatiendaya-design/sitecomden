"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import {
  listProductsForTemplate,
  unassignProductsFromTemplate,
} from "@/actions/cod-form-templates"
import AssignProductsModal from "./AssignProductsModal"
import { toast } from "sonner"

type Row = {
  id: string
  name: string
  slug: string
  basePrice: unknown
}

export default function AssignedProductsTab({ templateId }: { templateId: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const reload = () => {
    setLoading(true)
    listProductsForTemplate(templateId)
      .then((data) => setRows(data as Row[]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId])

  const onUnassign = async (id: string) => {
    if (!confirm("¿Quitar este producto de la plantilla? Se reasignará a Default.")) return
    try {
      await unassignProductsFromTemplate(templateId, [id])
      toast.success("Producto reasignado a Default")
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  return (
    <section className="border rounded-lg bg-white">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-medium text-sm">Productos asignados ({rows.length})</span>
        <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Asignar productos
        </Button>
      </div>
      <div className="p-3 space-y-1">
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">Ningún producto usa esta plantilla.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 p-2 border rounded text-sm">
            <span className="flex-1 truncate">{r.name}</span>
            <span className="text-xs text-muted-foreground">/{r.slug}</span>
            <Button variant="ghost" size="icon" onClick={() => onUnassign(r.id)} aria-label="Quitar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <AssignProductsModal
        templateId={templateId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAssigned={reload}
      />
    </section>
  )
}
