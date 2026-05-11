"use client"

import * as Lucide from "lucide-react"
import type { ComponentType } from "react"
import { Ban } from "lucide-react"

type LucideIcon = ComponentType<{ className?: string }>
const LucideIcons = Lucide as unknown as Record<string, LucideIcon | undefined>

type IconEntry = { name: string; label: string }

const CURATED_ICONS: readonly IconEntry[] = [
  { name: "ShoppingBag", label: "Bolsa" },
  { name: "ShoppingCart", label: "Carrito" },
  { name: "Package", label: "Paquete" },
  { name: "PackageCheck", label: "Paquete listo" },
  { name: "Truck", label: "Envío" },
  { name: "CreditCard", label: "Tarjeta" },
  { name: "Wallet", label: "Billetera" },
  { name: "Banknote", label: "Efectivo" },
  { name: "DollarSign", label: "Precio" },
  { name: "Tag", label: "Oferta" },
  { name: "Gift", label: "Regalo" },
  { name: "Zap", label: "Rápido" },
  { name: "Flame", label: "Trending" },
  { name: "Rocket", label: "Lanzamiento" },
  { name: "Sparkles", label: "Nuevo" },
  { name: "Star", label: "Destacado" },
  { name: "Crown", label: "Premium" },
  { name: "Heart", label: "Favorito" },
  { name: "ShieldCheck", label: "Seguro" },
  { name: "Lock", label: "Pago seguro" },
  { name: "BadgeCheck", label: "Verificado" },
  { name: "CheckCircle2", label: "Confirmado" },
  { name: "Check", label: "Listo" },
  { name: "ArrowRight", label: "Continuar" },
  { name: "ChevronRight", label: "Siguiente" },
] as const

interface IconPickerFieldProps {
  value: string | null
  onChange: (value: string | null) => void
}

export default function IconPickerField({ value, onChange }: IconPickerFieldProps) {
  const selectedLabel =
    CURATED_ICONS.find((i) => i.name === value)?.label ?? "Sin ícono"

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">{selectedLabel}</p>
      <div className="flex flex-wrap gap-1 p-1.5 rounded border bg-muted/30">
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Sin ícono"
          aria-label="Sin ícono"
          aria-pressed={value === null}
          className={`flex items-center justify-center h-7 w-7 rounded transition-colors ${
            value === null
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-background"
          }`}
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
        {CURATED_ICONS.map(({ name, label }) => {
          const Icon = LucideIcons[name]
          if (!Icon) return null
          const selected = value === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={label}
              aria-label={label}
              aria-pressed={selected}
              className={`flex items-center justify-center h-7 w-7 rounded transition-colors ${
                selected
                  ? "bg-foreground text-background"
                  : "hover:bg-background"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
