"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface FooterNewsletterContent {
  title?: string
  description?: string
  buttonLabel?: string
  successMessage?: string
}

type Status = "idle" | "submitting" | "success" | "error"

export function FooterNewsletter({ section }: Props) {
  const data = section.content as FooterNewsletterContent
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus("submitting")
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? "success" : "error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div
      className={`container mx-auto px-4 py-8 text-center ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      {data.title && (
        <h3 className="text-xl font-semibold mb-2">{data.title}</h3>
      )}
      {data.description && (
        <div
          className="text-sm text-muted-foreground mb-4"
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(data.description) }}
        />
      )}
      {status === "success" ? (
        <p className="text-sm">{data.successMessage ?? "¡Gracias!"}</p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
          <Button type="submit" disabled={status === "submitting"}>
            {data.buttonLabel ?? "Suscribirme"}
          </Button>
        </form>
      )}
    </div>
  )
}
