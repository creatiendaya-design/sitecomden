"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, MoreHorizontal } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  listLandingTemplates,
  unlinkTemplateFromProduct,
  type TemplateRow,
} from "@/actions/landing-templates"
import { ApplyTemplateDialog } from "./ApplyTemplateDialog"
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog"
import { toast } from "sonner"

interface Props {
  productId: string
  productSlug: string
  currentTemplateId: string | null
  currentBlockCount: number
}

export function TemplateSelector({
  productId,
  productSlug,
  currentTemplateId,
  currentBlockCount,
}: Props) {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [pending, setPending] = useState<{ template: TemplateRow } | null>(null)
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)
  const [unlinkPending, startUnlinkTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    listLandingTemplates({ active: true })
      .then(setTemplates)
      .catch(() => {})
  }, [])

  const handleSelectChange = (value: string) => {
    if (value === "__none__") {
      // Picking "Producto predeterminado" when already none — no-op.
      // When already linked, the unlink flow lives in Task 19.
      return
    }
    const t = templates.find((x) => x.id === value)
    if (!t) return
    if (t.id === currentTemplateId) return
    setPending({ template: t })
  }

  const currentTemplate = templates.find((t) => t.id === currentTemplateId) ?? null

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">Plantilla de tema</Label>
      <Select
        value={currentTemplateId ?? "__none__"}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className="h-8 text-xs w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Producto predeterminado</SelectItem>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {currentTemplate && (
            <>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/admin/landing-plantillas/${currentTemplate.id}`)
                }
              >
                <Eye className="mr-2 h-3.5 w-3.5" />
                Editar plantilla
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => setShowSaveAs(true)}
            disabled={currentBlockCount === 0}
          >
            Guardar como plantilla...
          </DropdownMenuItem>
          {currentTemplate && (
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setShowUnlinkConfirm(true)}
            >
              Desvincular plantilla
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {pending && (
        <ApplyTemplateDialog
          productId={productId}
          productSlug={productSlug}
          template={pending.template}
          currentBlockCount={currentBlockCount}
          open
          onOpenChange={(o) => {
            if (!o) setPending(null)
          }}
          onApplied={() => {
            setPending(null)
            router.refresh()
            toast.success("Plantilla aplicada")
          }}
        />
      )}

      <SaveAsTemplateDialog
        productId={productId}
        blockCount={currentBlockCount}
        open={showSaveAs}
        onOpenChange={setShowSaveAs}
      />

      <AlertDialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              Los bloques heredados de la plantilla se convertirán en bloques
              locales del producto. Tus personalizaciones se conservan. El
              producto queda independiente — los cambios futuros a la plantilla
              ya no le afectarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinkPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={unlinkPending}
              onClick={() => {
                startUnlinkTransition(async () => {
                  try {
                    await unlinkTemplateFromProduct(productId)
                    toast.success("Plantilla desvinculada")
                    setShowUnlinkConfirm(false)
                    router.refresh()
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Error al desvincular",
                    )
                  }
                })
              }}
            >
              {unlinkPending ? "Desvinculando..." : "Desvincular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
