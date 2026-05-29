"use client"

import { applyBlockStyle } from "@/lib/blocks/apply-style"
import { readContent, readStyleAndMedia } from "./_normalizeContent"
import CartView from "@/components/shop/cart/CartView"
import type { CartCustomization } from "@/components/shop/cart/cart-customization"

interface CartMainBlockProps {
  content: unknown
}

/**
 * Cart-skeleton block: wraps the actual `<CartView>` and forwards every
 * customizable label from the block's content as a typed
 * `CartCustomization`. When a label key is empty the view falls back to
 * the canonical Spanish default (see
 * `components/shop/cart/cart-customization.ts:CART_DEFAULTS`) — so a
 * freshly-seeded block paints exactly like the pre-Plan-17 cart page.
 *
 * Color schemes (Plan 13.1): the outer LandingBlockRenderer wrapper
 * emits `data-color-scheme={id}` when the admin picks a non-default
 * scheme on the block. The shared `[data-color-scheme] { … }` rule in
 * `app/globals.css` then bridges the scheme's `--theme-*` colors onto
 * the shadcn tokens (`--background`, `--card`, `--primary`, etc.) the
 * cart's <Card>/<Button>/<Badge> primitives consume — so the whole UI
 * repaints to match the chosen scheme without any per-block plumbing.
 */
export default function CartMainBlock({
  content: rawContent,
}: CartMainBlockProps) {
  const data = readContent<Record<string, unknown>>(rawContent, "CART_MAIN")
  const { style } = readStyleAndMedia(rawContent)
  const { className, style: inlineStyle } = applyBlockStyle(style)

  const customization: CartCustomization = {
    heading: asString(data.heading),
    emptyTitle: asString(data.emptyTitle),
    emptyMessage: asString(data.emptyMessage),
    emptyButtonText: asString(data.emptyButtonText),
    summaryTitle: asString(data.summaryTitle),
    subtotalLabel: asString(data.subtotalLabel),
    discountLabel: asString(data.discountLabel),
    shippingLabel: asString(data.shippingLabel),
    shippingValueText: asString(data.shippingValueText),
    totalLabel: asString(data.totalLabel),
    checkoutButtonText: asString(data.checkoutButtonText),
    checkoutLoadingText: asString(data.checkoutLoadingText),
    continueShoppingText: asString(data.continueShoppingText),
    paymentMethodsLabel: asString(data.paymentMethodsLabel),
  }

  return (
    <section className={className} style={inlineStyle}>
      <CartView customization={customization} />
    </section>
  )
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}
