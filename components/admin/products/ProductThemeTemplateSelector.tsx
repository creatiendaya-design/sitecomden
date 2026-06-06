"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Plus, SplitSquareHorizontal } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  assignProductTemplate,
  createProductTemplate,
  listProductTemplates,
  type ProductTemplateRow,
} from "@/actions/theme-product-templates"
import { toast } from "sonner"

interface Props {
  productId: string
  /** The product's current `themeProductTemplateId` (null = theme default). */
  currentTemplateId: string | null
}

const DEFAULT_VALUE = "__default__"
const CREATE_VALUE = "__create__"

/**
 * Plan 19 — assigns a product to a theme product template (or the theme
 * default). Replaces the legacy LandingTemplate-based `TemplateSelector`.
 * The actual section content is edited in the Customizer; this only picks
 * which template the product renders.
 */
export function ProductThemeTemplateSelector({
  productId,
  currentTemplateId,
}: Props) {
  const [templates, setTemplates] = useState<ProductTemplateRow[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const refresh = () =>
    listProductTemplates()
      .then(setTemplates)
      .catch(() => {})

  useEffect(() => {
    refresh()
  }, [])

  const themeId = templates[0]?.themeId ?? null
  const selectValue = currentTemplateId ?? DEFAULT_VALUE
  const currentTemplate = currentTemplateId
    ? templates.find((t) => t.id === currentTemplateId) ?? null
    : null

  /** Deep-link into the customizer's PRODUCT zone, on the given template. */
  const customizerHref = (templateId: string | null) => {
    if (!themeId) return null
    const base = `/admin/personalizar/temas/${themeId}/customize?target=product`
    return templateId
      ? `${base}&productTemplate=${encodeURIComponent(templateId)}`
      : base
  }

  const handleChange = (value: string) => {
    if (value === CREATE_VALUE) {
      setShowCreate(true)
      return
    }
    const templateId = value === DEFAULT_VALUE ? null : value
    if (templateId === currentTemplateId) return
    startTransition(async () => {
      try {
        await assignProductTemplate(productId, templateId)
        toast.success("Plantilla actualizada")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al asignar")
      }
    })
  }

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    startTransition(async () => {
      try {
        const tpl = await createProductTemplate(name)
        await assignProductTemplate(productId, tpl.id)
        setShowCreate(false)
        setNewName("")
        await refresh()
        toast.success("Plantilla creada y asignada", {
          action: (() => {
            const href = customizerHref(tpl.id)
            return href
              ? {
                  label: "Editar en personalizador",
                  onClick: () => router.push(href),
                }
              : undefined
          })(),
        })
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al crear")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Plantilla de producto</Label>
      <Select value={selectValue} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="h-8 text-xs w-[240px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_VALUE}>
            Predeterminada del tema
          </SelectItem>
          {templates
            .filter((t) => !t.isDefault)
            .map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          <SelectItem value={CREATE_VALUE} className="text-primary">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3 w-3" />
              Crear plantilla
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={!themeId}
            onClick={() => {
              const href = customizerHref(currentTemplateId)
              if (href) router.push(href)
            }}
          >
            <Pencil className="mr-2 h-3.5 w-3.5" />
            {currentTemplate
              ? "Editar esta plantilla"
              : "Editar plantilla del tema"}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!themeId}
            onClick={() => {
              if (!themeId) return
              router.push(
                `/admin/personalizar/temas/${themeId}/customize?target=product&productId=${encodeURIComponent(productId)}`,
              )
            }}
          >
            <SplitSquareHorizontal className="mr-2 h-3.5 w-3.5" />
            Personalizar solo este producto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla de producto</DialogTitle>
            <DialogDescription>
              Se crea copiando la plantilla predeterminada del tema y se asigna
              a este producto. Luego podrás editarla en el personalizador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Nombre</Label>
            <Input
              id="tpl-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Landing promo"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleCreate()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreate(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isPending || !newName.trim()}>
              {isPending ? "Creando..." : "Crear y asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
