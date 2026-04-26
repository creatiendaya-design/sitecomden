"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { createPolicy, type PolicyType } from "@/actions/policies"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

const POLICY_TYPE_OPTIONS: { value: PolicyType; label: string }[] = [
  { value: "TERMS", label: "Términos y condiciones" },
  { value: "PRIVACY", label: "Privacidad" },
  { value: "SHIPPING", label: "Envíos" },
  { value: "REFUND", label: "Devoluciones" },
  { value: "OTHER", label: "Otra" },
]

const NONE = "__none__"

export function CreatePolicyDialog({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [policyType, setPolicyType] = useState<string>(NONE)
  const [pending, startTransition] = useTransition()

  const reset = () => {
    setTitle("")
    setSlug("")
    setPolicyType(NONE)
  }

  const handleSubmit = () => {
    if (pending) return
    if (!title.trim()) {
      toast.error("El título es obligatorio")
      return
    }
    if (!slug.trim()) {
      toast.error("El slug es obligatorio")
      return
    }
    startTransition(async () => {
      try {
        const { id } = await createPolicy({
          title: title.trim(),
          slug: slug.trim(),
          policyType: policyType === NONE ? null : (policyType as PolicyType),
        })
        toast.success("Política creada")
        reset()
        onCreated(id)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al crear")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear política</DialogTitle>
          <DialogDescription>
            Definí el título, slug y tipo. Vas a editar el contenido a
            continuación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="policy-title">Título</Label>
            <Input
              id="policy-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Términos y condiciones"
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-slug">Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">/politicas/</span>
              <Input
                id="policy-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="terminos"
                disabled={pending}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Solo minúsculas, números y guiones.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy-type">Tipo</Label>
            <Select
              value={policyType}
              onValueChange={setPolicyType}
              disabled={pending}
            >
              <SelectTrigger id="policy-type">
                <SelectValue placeholder="Sin tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sin tipo</SelectItem>
                {POLICY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El tipo permite que el sistema enlace automáticamente la política
              correcta desde el checkout/footer.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Creando…" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
