"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import {
  listTemplateOptions,
  assignTemplateToProducts,
} from "@/actions/cod-form-templates"
import type { CheckoutMode } from "@prisma/client"

type TemplateOpt = { id: string; name: string; isDefault: boolean }
type CheckoutChoice = "no-change" | CheckoutMode

export default function BulkAssignCodTemplateModal({
  open,
  onClose,
  selectedIds,
  onApplied,
}: {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onApplied: () => void
}) {
  const [templates, setTemplates] = useState<TemplateOpt[]>([])
  const [templateId, setTemplateId] = useState<string>("")
  const [checkoutMode, setCheckoutMode] = useState<CheckoutChoice>("no-change")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    listTemplateOptions().then((opts) => {
      setTemplates(opts)
      const def = opts.find((t) => t.isDefault)
      setTemplateId(def?.id ?? opts[0]?.id ?? "")
    })
  }, [open])

  const onApply = () => {
    if (!templateId) {
      toast.error("Selecciona una plantilla")
      return
    }
    if (selectedIds.length === 0) return

    startTransition(async () => {
      try {
        const mode = checkoutMode === "no-change" ? undefined : checkoutMode
        const result = await assignTemplateToProducts(
          templateId,
          selectedIds,
          mode,
        )
        toast.success(`${result.updated} producto(s) actualizado(s)`)
        onApplied()
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al asignar")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar plantilla COD</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {selectedIds.length} producto(s) seleccionado(s).
          </p>

          <div>
            <Label className="text-xs">Plantilla COD</Label>
            <select
              className="w-full border rounded h-9 px-2 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={pending}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isDefault ? "* " : ""}
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Modo de checkout</Label>
            <RadioGroup
              value={checkoutMode}
              onValueChange={(v) => setCheckoutMode(v as CheckoutChoice)}
              className="mt-1"
            >
              <Row value="no-change" label="Sin cambios" />
              <Row value="STANDARD" label="Carrito normal (sin COD)" />
              <Row value="COD_AND_CART" label="Carrito + COD" />
              <Row value="COD_ONLY" label="Solo COD" />
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onApply} disabled={pending || !templateId}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <RadioGroupItem value={value} />
      <span>{label}</span>
    </label>
  )
}
