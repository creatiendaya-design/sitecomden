"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Truck, ExternalLink } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useCodFormEditor } from "./store"

export type AvailableShippingRate = {
  id: string
  name: string
  baseCost: number
  zoneId: string
  zoneName: string
  zoneActive: boolean
  active: boolean
  excludeFromRegularCheckout: boolean
}

export default function ShippingRatesPanel({
  rates,
}: {
  rates: AvailableShippingRate[]
}) {
  const selected = useCodFormEditor((s) => s.shippingRateIds)
  const toggle = useCodFormEditor((s) => s.toggleShippingRateId)

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { zoneId: string; zoneName: string; zoneActive: boolean; rates: AvailableShippingRate[] }
    >()
    for (const r of rates) {
      const existing = map.get(r.zoneId)
      if (existing) {
        existing.rates.push(r)
      } else {
        map.set(r.zoneId, {
          zoneId: r.zoneId,
          zoneName: r.zoneName,
          zoneActive: r.zoneActive,
          rates: [r],
        })
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.zoneName.localeCompare(b.zoneName),
    )
  }, [rates])

  const selectedCount = selected.length

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between gap-2 border-b px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-semibold truncate">Tarifas de envío</h3>
        </div>
        <Link
          href="/admin/envios/tarifas"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
          target="_blank"
          aria-label="Administrar tarifas"
        >
          <span className="hidden sm:inline">Administrar tarifas</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="px-3 sm:px-4 py-3 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {selectedCount === 0 ? (
            <>
              Sin tarifas asignadas — los productos COD usarán las tarifas
              regulares del sistema (las que no estén marcadas como{" "}
              <em>solo COD</em>).
            </>
          ) : (
            <>
              Solo las tarifas seleccionadas ({selectedCount}) se mostrarán
              en el modal COD para productos vinculados a esta plantilla.
            </>
          )}
        </p>

        {rates.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            No hay tarifas configuradas todavía.{" "}
            <Link
              href="/admin/envios"
              target="_blank"
              className="underline underline-offset-2"
            >
              Crear tarifas
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((zone) => (
              <div key={zone.zoneId} className="space-y-1.5">
                <div className="flex items-center flex-wrap gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="truncate">{zone.zoneName}</span>
                  {!zone.zoneActive && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                      Inactiva
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {zone.rates.map((r) => {
                    const checked = selected.includes(r.id)
                    return (
                      <li
                        key={r.id}
                        className="flex items-start gap-2 rounded-md border px-2.5 py-2"
                      >
                        <Checkbox
                          id={`rate-${r.id}`}
                          checked={checked}
                          onCheckedChange={() => toggle(r.id)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <Label
                              htmlFor={`rate-${r.id}`}
                              className="cursor-pointer text-sm font-normal break-words leading-snug"
                            >
                              {r.name}
                            </Label>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                              S/ {r.baseCost.toFixed(2)}
                            </span>
                          </div>
                          {(!r.active || r.excludeFromRegularCheckout) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {!r.active && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">
                                  Inactiva
                                </span>
                              )}
                              {r.excludeFromRegularCheckout && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase text-amber-900">
                                  Solo COD
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
