"use client"

import { useState, type CSSProperties, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sanitizeRichText } from "@/lib/blocks/sanitize-rich-text"
import { applyBlockStyle } from "@/lib/blocks/apply-style"
import type { BlockStyle } from "@/lib/blocks/types"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
}

interface NewsletterContent {
  title?: string
  description?: string
  buttonLabel?: string
  successMessage?: string
  /** Same shape as every other block — the customizer's right sidebar
   *  writes `colorSchemeId`, padding, bg color, etc. here. */
  style?: BlockStyle
}

type Status = "idle" | "submitting" | "success" | "error"

/**
 * Newsletter sub-block. Occupies exactly one grid cell of the parent
 * footer's column grid, the same as any LINK_COLUMN / TEXT_COLUMN —
 * "respects the footer layout" means letting the layout decide the
 * width, not overriding it from inside the block.
 *
 * Form is always stacked (input above, button below, both full-width
 * of the column) because a single column in a 4-col footer is too
 * narrow for an inline email + submit row. Matches the look of
 * Shopify's built-in newsletter block.
 *
 * Theming:
 *   - The block's own BlockStyle (color scheme, bg color, padding, etc.)
 *     is applied via `applyBlockStyle` exactly like every other block,
 *     so picking "Esquema de color" on this sub-block actually paints
 *     the wrapper.
 *   - The submit button is bound to the theme's `--theme-primary` /
 *     `--theme-primary-foreground` custom properties (via inline style)
 *     instead of shadcn's hard-coded `bg-primary`. When a color scheme
 *     is active anywhere up the DOM (section-level or block-level), the
 *     button picks up the scheme's primary color automatically.
 *   - The email input's border is bound to `--theme-border` for the
 *     same reason. When the scheme defines a border color it shows up
 *     here; otherwise it falls back to the theme's default border.
 *
 * Hover dim isn't preserved (inline style wins over Tailwind's
 * `hover:bg-primary/90`), but that matches the trade-off Shopify makes
 * on themed buttons too.
 */
export function NewsletterBlock({ block }: Props) {
  const data = block.content as NewsletterContent
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

  const {
    className: styleClass,
    style: resolvedStyle,
  } = applyBlockStyle(data.style)
  const colorSchemeId = data.style?.colorSchemeId

  const buttonStyle: CSSProperties = {
    backgroundColor: "var(--theme-primary)",
    color: "var(--theme-primary-foreground)",
  }
  const inputStyle: CSSProperties = {
    borderColor: "var(--theme-border)",
  }

  return (
    <SubBlockWrapper
      block={block}
      colorScheme={colorSchemeId}
      className={`flex flex-col gap-3 ${styleClass}`}
      style={resolvedStyle}
    >
      {data.title && (
        <h3
          data-content-field="title"
          className="text-lg font-semibold leading-tight"
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <div
          className="text-sm opacity-80"
          dangerouslySetInnerHTML={{
            __html: sanitizeRichText(data.description),
          }}
        />
      )}
      {status === "success" ? (
        <p className="text-sm font-medium">
          {data.successMessage ?? "¡Gracias!"}
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 mt-1 w-full"
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full"
            style={inputStyle}
          />
          <Button
            type="submit"
            disabled={status === "submitting"}
            className="w-full"
            style={buttonStyle}
          >
            {data.buttonLabel ?? "Suscribirme"}
          </Button>
        </form>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive">
          No pudimos suscribir tu email. Intentá de nuevo.
        </p>
      )}
    </SubBlockWrapper>
  )
}
