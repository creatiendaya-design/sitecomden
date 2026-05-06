"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ExternalLink } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { listTemplateOptions } from "@/actions/cod-form-templates"
import type { CheckoutMode } from "@prisma/client"

type Option = { id: string; name: string; isDefault: boolean }

export default function CodFormTemplateCard({
  checkoutMode,
  templateId,
  onChange,
}: {
  checkoutMode: CheckoutMode
  templateId: string | null
  onChange: (patch: {
    checkoutMode?: CheckoutMode
    codFormTemplateId?: string | null
  }) => void
}) {
  const [options, setOptions] = useState<Option[]>([])

  useEffect(() => {
    listTemplateOptions().then(setOptions)
  }, [])

  const showsTemplateSelector = checkoutMode !== "STANDARD"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Modo de checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <RadioGroup
          value={checkoutMode}
          onValueChange={(v) => onChange({ checkoutMode: v as CheckoutMode })}
        >
          <Row value="STANDARD" label="Carrito normal (sin COD)" />
          <Row value="COD_AND_CART" label="Carrito + Pago Contra Entrega" />
          <Row value="COD_ONLY" label="Solo Pago Contra Entrega" />
        </RadioGroup>

        {showsTemplateSelector && (
          <div className="border-t pt-3">
            <Label className="text-xs">Plantilla COD</Label>
            <select
              className="w-full border rounded h-9 px-2 text-sm"
              value={templateId ?? ""}
              onChange={(e) =>
                onChange({ codFormTemplateId: e.target.value || null })
              }
            >
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.isDefault ? "★ " : ""}
                  {o.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/formularios-cod"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              Gestionar plantillas
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ value, label }: { value: string; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <RadioGroupItem value={value} />
      <span className="text-sm">{label}</span>
    </label>
  )
}
