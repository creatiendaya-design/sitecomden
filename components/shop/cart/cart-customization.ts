/**
 * Customization values consumed by `CartView`. Every field is optional —
 * when a key is missing or empty the view falls back to the literal it
 * would have rendered before this prop existed, so the storefront stays
 * pixel-identical for any tenant that hasn't opted into the customizer's
 * cart editing.
 *
 * Populated by the `CART_MAIN` page-builder block (see
 * `components/shop/templates/blocks/CartMainBlock.tsx`).
 */
export interface CartCustomization {
  /** Top-of-page heading shown above the items list. */
  heading?: string
  /** Heading + supporting copy + CTA shown when the cart has no items. */
  emptyTitle?: string
  emptyMessage?: string
  emptyButtonText?: string
  /** Right-column summary panel. */
  summaryTitle?: string
  subtotalLabel?: string
  discountLabel?: string
  shippingLabel?: string
  shippingValueText?: string
  totalLabel?: string
  /** Checkout CTA + the bottom "continue shopping" link. */
  checkoutButtonText?: string
  checkoutLoadingText?: string
  continueShoppingText?: string
  /** Label above the payment-method icons grid. */
  paymentMethodsLabel?: string
}

export const CART_DEFAULTS: Required<CartCustomization> = {
  heading: "Carrito de Compras",
  emptyTitle: "Tu carrito está vacío",
  emptyMessage: "Agrega productos para comenzar tu compra",
  emptyButtonText: "Ver Productos",
  summaryTitle: "Resumen del Pedido",
  subtotalLabel: "Subtotal",
  discountLabel: "Descuento por promociones",
  shippingLabel: "Envío",
  shippingValueText: "Calculado en checkout",
  totalLabel: "Total",
  checkoutButtonText: "Proceder al Pago",
  checkoutLoadingText: "Verificando stock...",
  continueShoppingText: "← Seguir Comprando",
  paymentMethodsLabel: "Métodos de pago aceptados",
}

/**
 * Resolve a single customization key to a non-empty string, falling back
 * to the canonical default. Use everywhere the view paints customizable
 * copy — empty strings count as "use default" so admin clearing a field
 * doesn't blank the UI.
 */
export function pickText(
  customization: CartCustomization | undefined,
  key: keyof CartCustomization,
): string {
  const raw = customization?.[key]?.trim()
  return raw && raw.length > 0 ? raw : CART_DEFAULTS[key]
}
