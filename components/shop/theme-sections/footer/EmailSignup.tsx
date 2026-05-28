"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import { SectionWrapper } from "../_helpers"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface EmailSignupContent {
  heading?: string
  description?: string
  placeholder?: string
  buttonLabel?: string
  successMessage?: string
  alignment?: "left" | "center"
}

type Status = "idle" | "submitting" | "success" | "error"

export function EmailSignup({ section }: Props) {
  const data = section.content as EmailSignupContent
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const alignment = data.alignment ?? "center"

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
    <SectionWrapper section={section} as="div">
      <div
        className={
          alignment === "center"
            ? "container mx-auto px-4 py-10 max-w-2xl text-center"
            : "container mx-auto px-4 py-10 max-w-2xl"
        }
      >
        {data.heading && (
          <h2
            data-content-field="heading"
            className="text-2xl font-semibold mb-3"
          >
            {data.heading}
          </h2>
        )}
        {data.description && (
          <div
            className="text-sm text-muted-foreground mb-5"
            dangerouslySetInnerHTML={{
              __html: sanitizeRichText(data.description),
            }}
          />
        )}
        {status === "success" ? (
          <p className="text-sm">
            {data.successMessage ?? "¡Gracias por suscribirte!"}
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className={
              alignment === "center"
                ? "flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
                : "flex flex-col sm:flex-row gap-2 max-w-md"
            }
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={data.placeholder ?? "tu@email.com"}
            />
            <Button type="submit" disabled={status === "submitting"}>
              {data.buttonLabel ?? "Suscribirme"}
            </Button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-destructive">
            No pudimos suscribir tu email. Intentá de nuevo.
          </p>
        )}
      </div>
    </SectionWrapper>
  )
}
