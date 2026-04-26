"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
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
import type { MenuRow } from "@/actions/menus"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  themeId: string
  currentHeaderMenuId: string | null
  currentFooterMenuId: string | null
  menus: MenuRow[]
  onSaved: () => void
}

const NONE = "__none__"

export function ThemeMenuPicker({
  open,
  onOpenChange,
  themeId,
  currentHeaderMenuId,
  currentFooterMenuId,
  menus,
  onSaved,
}: Props) {
  const [headerId, setHeaderId] = useState<string>(
    currentHeaderMenuId ?? NONE,
  )
  const [footerId, setFooterId] = useState<string>(
    currentFooterMenuId ?? NONE,
  )
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    if (pending) return
    startTransition(async () => {
      try {
        await updateThemeMetadata(themeId, {
          headerMenuId: headerId === NONE ? null : headerId,
          footerMenuId: footerId === NONE ? null : footerId,
        })
        toast.success("Header & Footer actualizados")
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
        if (!o) {
          setHeaderId(currentHeaderMenuId ?? NONE)
          setFooterId(currentFooterMenuId ?? NONE)
        }
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Header & Footer</DialogTitle>
          <DialogDescription>
            Asigná los menús que verá la tienda. Si dejás &quot;Sin asignar&quot;,
            se usa el menú con slug <code>main</code> (header) o{" "}
            <code>footer</code> (footer) como fallback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="theme-header-menu">Menú del header</Label>
            <Select
              value={headerId}
              onValueChange={setHeaderId}
              disabled={pending}
            >
              <SelectTrigger id="theme-header-menu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  Sin asignar (usar menú &quot;main&quot;)
                </SelectItem>
                {menus.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}{" "}
                    <span className="text-muted-foreground">/{m.slug}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme-footer-menu">Menú del footer</Label>
            <Select
              value={footerId}
              onValueChange={setFooterId}
              disabled={pending}
            >
              <SelectTrigger id="theme-footer-menu">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  Sin asignar (usar menú &quot;footer&quot;)
                </SelectItem>
                {menus.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}{" "}
                    <span className="text-muted-foreground">/{m.slug}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {menus.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay menús activos todavía. Creá uno desde{" "}
              <Link href="/admin/menus" className="underline">
                Menús
              </Link>
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
