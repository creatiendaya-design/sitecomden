/**
 * Pay-button chrome for the checkout CTA, driven by `--theme-checkout-button-*`
 * (customizer → "Checkout") with a fallback to the global brand `--cta`.
 * Applied ON TOP of the Button `cta` variant; tailwind-merge lets these win
 * over the variant's bg/text/radius (including the variant's `hover:bg-cta/90`,
 * which we override with an explicit darken so a custom color hovers correctly).
 * Literal string — no concatenation — so Tailwind emits the classes.
 *
 * Lives in a server-safe module (no "use client") so the storefront `/orden/`
 * Server Components can import it without it becoming a client reference. The
 * checkout pay button and the order-screen CTAs (confirmación / pago-paypal /
 * pago-mercadopago / pago-pendiente) share this single class so one edit in the
 * customizer's "Checkout" section themes the whole buy flow consistently.
 */
export const checkoutPayButtonClass =
  "bg-[var(--theme-checkout-button-bg,var(--cta))] text-[var(--theme-checkout-button-text,var(--cta-foreground))] rounded-[var(--theme-checkout-button-radius,0.375rem)] hover:bg-[color-mix(in_oklab,var(--theme-checkout-button-bg,var(--cta))_90%,black)]";
