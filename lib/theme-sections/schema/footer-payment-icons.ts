import { CreditCard } from "lucide-react"
import type { ThemeSectionDefinition } from "../types"

export const footerPaymentIconsDefinition: ThemeSectionDefinition = {
  type: "FOOTER_PAYMENT_ICONS",
  groups: ["FOOTER"],
  label: "Métodos de pago",
  description: "Iconos de medios de pago aceptados (Visa, Mastercard, Yape, …).",
  icon: CreditCard,
  maxPerGroup: 1,
  fields: [
    {
      type: "multi-select",
      key: "methods",
      label: "Métodos a mostrar",
      options: [
        { value: "VISA", label: "Visa" },
        { value: "MASTERCARD", label: "Mastercard" },
        { value: "AMEX", label: "American Express" },
        { value: "YAPE", label: "Yape" },
        { value: "PLIN", label: "Plin" },
        { value: "PAYPAL", label: "PayPal" },
      ],
    },
  ],
  defaultContent: { methods: ["VISA", "MASTERCARD", "YAPE", "PLIN"] },
}
