"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search } from "lucide-react"
import {
  searchProductsToAssign,
  assignTemplateToProducts,
} from "@/actions/cod-form-templates"
import { toast } from "sonner"

type Hit = {
  id: string
  name: string
  slug: string
  codFormTemplateId: string | null
}

export default function AssignProductsModal({
  templateId,
  open,
  onClose,
  onAssigned,
}: {
  templateId: string
  open: boolean
  onClose: () => void
  onAssigned: () => void
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [searching, setSearching] = useState(false)

  const onSearch = () => {
    setSearching(true)
    searchProductsToAssign(query)
      .then((rows) => setHits(rows as Hit[]))
      .finally(() => setSearching(false))
  }

  const togglePick = (id: string) => {
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onApply = () => {
    if (picked.size === 0) return
    if (!confirm(`Asignar plantilla a ${picked.size} producto(s)?`)) return
    startTransition(async () => {
      try {
        await assignTemplateToProducts(templateId, Array.from(picked))
        toast.success("Plantilla asignada")
        onAssigned()
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al asignar")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar productos</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          <Button variant="outline" onClick={onSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <div className="space-y-1 mt-3">
          {hits.map((h) => (
            <label
              key={h.id}
              className="flex items-center gap-2 p-2 border rounded text-sm hover:bg-muted/30"
            >
              <input
                type="checkbox"
                checked={picked.has(h.id)}
                onChange={() => togglePick(h.id)}
              />
              <span className="flex-1">{h.name}</span>
              {h.codFormTemplateId === templateId && (
                <span className="text-xs text-muted-foreground">ya asignado</span>
              )}
            </label>
          ))}
          {hits.length === 0 && !searching && (
            <p className="text-sm text-muted-foreground">Busca para empezar.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onApply} disabled={pending || picked.size === 0}>
            Asignar ({picked.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
