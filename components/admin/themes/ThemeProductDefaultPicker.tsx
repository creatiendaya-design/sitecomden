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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { updateThemeMetadata } from "@/actions/themes"
import type { TemplateRow } from "@/actions/landing-templates"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  themeId: string
  currentTemplateId: string | null
  landingTemplates: TemplateRow[]
  onSaved: () => void
}

const NONE_VALUE = "__none__"

export function ThemeProductDefaultPicker({
  open,
  onOpenChange,
  themeId,
  currentTemplateId,
  landingTemplates,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<string>(currentTemplateId ?? NONE_VALUE)
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    if (pending) return
    const next = selected === NONE_VALUE ? null : selected
    startTransition(async () => {
      try {
        await updateThemeMetadata(themeId, {
          defaultProductLandingTemplateId: next,
        })
        toast.success("Plantilla por defecto actualizada")
        onSaved()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSelected(currentTemplateId ?? NONE_VALUE)
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plantilla de producto por defecto</DialogTitle>
          <DialogDescription>
            Esta plantilla se usará en cualquier producto que no tenga una
            asignada explícitamente. El admin puede sobrescribirla en cada
            producto desde su page builder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="default-template">Plantilla</Label>
          <Select value={selected} onValueChange={setSelected} disabled={pending}>
            <SelectTrigger id="default-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Sin plantilla por defecto</SelectItem>
              {landingTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {landingTemplates.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay plantillas activas todavía. Creá una desde{" "}
              <a
                href="/admin/landing-plantillas/biblioteca"
                className="underline"
              >
                Plantillas de Landing
              </a>
              .
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
