"use client"

import { type ReactNode } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCodFormEditor } from "./store"
import type { PostSubmitAction } from "@/lib/cod-forms/types"

type PageOpt = { id: string; slug: string; title: string }

export default function PostSubmitActionPopover({
  pages,
  children,
}: {
  pages: PageOpt[]
  children: ReactNode
}) {
  // Subscribe to individual fields to avoid re-rendering on every store
  // change (e.g. saveStatus toggles in the toolbar would otherwise force
  // this component to re-render even when the popover is closed).
  const action = useCodFormEditor((s) => s.postSubmitAction)
  const thankYouTitle = useCodFormEditor((s) => s.thankYouTitle)
  const thankYouMessage = useCodFormEditor((s) => s.thankYouMessage)
  const whatsappNumber = useCodFormEditor((s) => s.whatsappNumber)
  const whatsappMessage = useCodFormEditor((s) => s.whatsappMessage)
  const thankYouPageId = useCodFormEditor((s) => s.thankYouPageId)
  const setPostSubmit = useCodFormEditor((s) => s.setPostSubmit)
  const setThankYouTitle = useCodFormEditor((s) => s.setThankYouTitle)
  const setThankYouMessage = useCodFormEditor((s) => s.setThankYouMessage)
  const setWhatsappNumber = useCodFormEditor((s) => s.setWhatsappNumber)
  const setWhatsappMessage = useCodFormEditor((s) => s.setWhatsappMessage)
  const setThankYouPageId = useCodFormEditor((s) => s.setThankYouPageId)

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 space-y-3">
        <div className="font-medium text-sm">Acción al confirmar el pedido</div>
        <RadioGroup
          value={action}
          onValueChange={(v) => setPostSubmit(v as PostSubmitAction)}
          className="space-y-3"
        >
          {/* WhatsApp */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="WHATSAPP_REDIRECT" id="opt-wa" />
              <Label htmlFor="opt-wa">Enviar a WhatsApp</Label>
            </div>
            {action === "WHATSAPP_REDIRECT" && (
              <div className="ml-6 space-y-2">
                <div>
                  <Label className="text-xs">Número</Label>
                  <Input
                    value={whatsappNumber ?? ""}
                    onChange={(e) =>
                      setWhatsappNumber(e.target.value || null)
                    }
                    placeholder="+51999999999"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mensaje WhatsApp</Label>
                  <Textarea
                    value={whatsappMessage ?? ""}
                    onChange={(e) =>
                      setWhatsappMessage(e.target.value || null)
                    }
                    rows={4}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="border-t pt-2 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Agradecimiento que ve el cliente en pantalla
                  </p>
                  <Input
                    placeholder="Título"
                    value={thankYouTitle ?? ""}
                    onChange={(e) =>
                      setThankYouTitle(e.target.value || null)
                    }
                  />
                  <Textarea
                    placeholder="Mensaje"
                    rows={2}
                    value={thankYouMessage ?? ""}
                    onChange={(e) =>
                      setThankYouMessage(e.target.value || null)
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Page redirect */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="THANK_YOU_PAGE" id="opt-page" />
              <Label htmlFor="opt-page">
                Redirigir a página de agradecimiento
              </Label>
            </div>
            {action === "THANK_YOU_PAGE" && (
              <div className="ml-6">
                <Label className="text-xs">Página</Label>
                <select
                  value={thankYouPageId ?? ""}
                  onChange={(e) =>
                    setThankYouPageId(e.target.value || null)
                  }
                  className="w-full border rounded h-9 px-2 text-sm"
                >
                  <option value="">— Seleccionar —</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (/{p.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Inline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="INLINE_THANK_YOU" id="opt-inline" />
              <Label htmlFor="opt-inline">
                Mostrar agradecimiento encima del formulario
              </Label>
            </div>
            {action === "INLINE_THANK_YOU" && (
              <div className="ml-6 space-y-2">
                <Input
                  placeholder="Título"
                  value={thankYouTitle ?? ""}
                  onChange={(e) =>
                    setThankYouTitle(e.target.value || null)
                  }
                />
                <Textarea
                  placeholder="Mensaje"
                  rows={2}
                  value={thankYouMessage ?? ""}
                  onChange={(e) =>
                    setThankYouMessage(e.target.value || null)
                  }
                />
              </div>
            )}
          </div>
        </RadioGroup>
      </PopoverContent>
    </Popover>
  )
}
