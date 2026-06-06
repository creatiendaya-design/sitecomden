"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, Loader2, Search, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  CURATED_FONTS,
  FONT_CATEGORY_LABEL,
  customFontStack,
  findCuratedByStack,
  normalizeStack,
  type FontCategory,
} from "@/lib/fonts/catalog"
import {
  customFontsToCss,
  type CustomFontRecord,
} from "@/lib/fonts/custom"
import { uploadCustomFont, deleteCustomFont } from "@/actions/fonts"

interface FontPickerProps {
  label: string
  /** Current font-family stack stored in the theme token. */
  value: string
  onChange: (stack: string) => void
  customFonts: CustomFontRecord[]
  /** Called after an upload/delete so the parent can re-fetch the list. */
  onFontsChanged: () => void
  disabled?: boolean
}

const CATEGORY_ORDER: FontCategory[] = ["sans", "serif", "display"]

export function FontPicker({
  label,
  value,
  onChange,
  customFonts,
  onFontsChanged,
  disabled,
}: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [showCustomCss, setShowCustomCss] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)

  // Resolve what the stored stack currently maps to (curated / custom / free).
  const curated = findCuratedByStack(value)
  const matchedCustom = !curated
    ? customFonts.find(
        (f) => normalizeStack(customFontStack(f.family)) === normalizeStack(value),
      )
    : undefined
  const isFreeText = !curated && !matchedCustom && value.trim().length > 0
  const selectedLabel =
    curated?.label ?? matchedCustom?.family ?? (isFreeText ? "Personalizado" : "Predeterminada")
  const selectedStack = curated?.stack ?? (matchedCustom ? customFontStack(matchedCustom.family) : value)

  // Inject @font-face for uploaded fonts so their preview renders here in the
  // admin (the storefront tokens.css isn't loaded on admin pages).
  const customFaceCss = useMemo(() => customFontsToCss(customFonts), [customFonts])

  const filteredCurated = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CURATED_FONTS.filter((f) => !q || f.label.toLowerCase().includes(q))
  }, [query])

  const filteredCustom = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customFonts.filter((f) => !q || f.family.toLowerCase().includes(q))
  }, [customFonts, query])

  const handlePick = (stack: string) => {
    onChange(stack)
    setOpen(false)
    setQuery("")
  }

  const handleDelete = async (id: string, family: string) => {
    const res = await deleteCustomFont(id)
    if (res.ok) {
      toast.success(`Fuente "${family}" eliminada`)
      onFontsChanged()
    } else {
      toast.error(res.error ?? "No se pudo eliminar la fuente")
    }
  }

  return (
    <div className="space-y-1.5">
      {customFaceCss ? (
        <style dangerouslySetInnerHTML={{ __html: customFaceCss }} />
      ) : null}

      <Label className="text-xs">{label}</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-9 w-full justify-between font-normal"
          >
            <span className="truncate" style={{ fontFamily: selectedStack }}>
              {selectedLabel}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar fuente…"
              className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ScrollArea className="max-h-72">
            <div className="p-1">
              {/* Uploaded fonts */}
              {filteredCustom.length > 0 && (
                <FontGroup title="Mis fuentes">
                  {filteredCustom.map((f) => {
                    const stack = customFontStack(f.family)
                    const isSel = matchedCustom?.id === f.id
                    return (
                      <div key={f.id} className="group flex items-center">
                        <FontOption
                          label={f.family}
                          stack={stack}
                          selected={isSel}
                          onClick={() => handlePick(stack)}
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id, f.family)}
                          className="mr-1 rounded p-1 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                          title="Eliminar fuente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </FontGroup>
              )}

              {/* Curated Google fonts by category */}
              {CATEGORY_ORDER.map((cat) => {
                const fonts = filteredCurated.filter((f) => f.category === cat)
                if (fonts.length === 0) return null
                return (
                  <FontGroup key={cat} title={FONT_CATEGORY_LABEL[cat]}>
                    {fonts.map((f) => (
                      <FontOption
                        key={f.id}
                        label={f.label}
                        stack={f.stack}
                        selected={curated?.id === f.id}
                        onClick={() => handlePick(f.stack)}
                      />
                    ))}
                  </FontGroup>
                )
              })}

              {filteredCurated.length === 0 && filteredCustom.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Sin resultados
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between gap-2 border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setOpen(false)
                setUploadOpen(true)
              }}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Subir fuente
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setShowCustomCss((v) => !v)
                setOpen(false)
              }}
            >
              Personalizado (CSS)
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Advanced: raw CSS font-family stack (legacy / power users). */}
      {(showCustomCss || isFreeText) && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder='"Mi fuente", system-ui, sans-serif'
          className="h-8 font-mono text-xs"
        />
      )}

      <UploadFontDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={(stack) => {
          onFontsChanged()
          if (stack) onChange(stack)
        }}
      />
    </div>
  )
}

function FontGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

function FontOption({
  label,
  stack,
  selected,
  onClick,
}: {
  label: string
  stack: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
        selected && "bg-accent/60",
      )}
    >
      <span className="truncate" style={{ fontFamily: stack }}>
        {label}
      </span>
      {selected && <Check className="ml-2 h-3.5 w-3.5 shrink-0" />}
    </button>
  )
}

const WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"]

function UploadFontDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Receives the stack of the uploaded font so it can be auto-selected. */
  onUploaded: (stack: string | null) => void
}) {
  const [family, setFamily] = useState("")
  const [weight, setWeight] = useState("400")
  const [style, setStyle] = useState<"normal" | "italic">("normal")
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setFamily("")
    setWeight("400")
    setStyle("normal")
    setFile(null)
  }

  const handleSubmit = async () => {
    if (busy) return
    if (!family.trim()) {
      toast.error("Escribe un nombre para la fuente")
      return
    }
    if (!file) {
      toast.error("Selecciona un archivo de fuente")
      return
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("family", family.trim())
      fd.append("weight", weight)
      fd.append("style", style)
      const res = await uploadCustomFont(fd)
      if (res.ok && res.font) {
        toast.success(`Fuente "${res.font.family}" subida`)
        onUploaded(customFontStack(res.font.family))
        reset()
        onOpenChange(false)
      } else {
        toast.error(res.error ?? "No se pudo subir la fuente")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir fuente propia</DialogTitle>
          <DialogDescription>
            Sube un archivo WOFF2, WOFF, TTF u OTF (máx. 5MB). Para varios pesos
            (negrita, etc.) sube cada archivo con el mismo nombre de fuente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="font-family" className="text-xs">
              Nombre de la fuente
            </Label>
            <Input
              id="font-family"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="Mi Marca"
              disabled={busy}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Peso</Label>
              <Select value={weight} onValueChange={setWeight} disabled={busy}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEIGHTS.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estilo</Label>
              <Select
                value={style}
                onValueChange={(v) => setStyle(v as "normal" | "italic")}
                disabled={busy}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Itálica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="font-file" className="text-xs">
              Archivo
            </Label>
            <Input
              id="font-file"
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
