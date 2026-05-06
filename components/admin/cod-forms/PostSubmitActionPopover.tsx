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
  const action = useCodFormEditor((s) => s.postSubmitAction)
  const set = useCodFormEditor.getState()
  const {
    thankYouTitle,
    thankYouMessage,
    whatsappNumber,
    whatsappMessage,
    thankYouPageId,
  } = useCodFormEditor()

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 space-y-3">
        <div className="font-medium text-sm">Acción al confirmar el pedido</div>
        <RadioGroup
          value={action}
          onValueChange={(v) => set.setPostSubmit(v as PostSubmitAction)}
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
                      set.setWhatsappNumber(e.target.value || null)
                    }
                    placeholder="+51999999999"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mensaje WhatsApp</Label>
                  <Textarea
                    value={whatsappMessage ?? ""}
                    onChange={(e) =>
                      set.setWhatsappMessage(e.target.value || null)
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
                      set.setThankYouTitle(e.target.value || null)
                    }
                  />
                  <Textarea
                    placeholder="Mensaje"
                    rows={2}
                    value={thankYouMessage ?? ""}
                    onChange={(e) =>
                      set.setThankYouMessage(e.target.value || null)
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
                    set.setThankYouPageId(e.target.value || null)
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
                    set.setThankYouTitle(e.target.value || null)
                  }
                />
                <Textarea
                  placeholder="Mensaje"
                  rows={2}
                  value={thankYouMessage ?? ""}
                  onChange={(e) =>
                    set.setThankYouMessage(e.target.value || null)
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
