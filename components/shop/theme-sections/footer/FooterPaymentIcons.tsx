import {
  VisaIcon,
  MastercardIcon,
  YapeIcon,
  PlinIcon,
  PayPalIcon,
} from "@/components/payment-icons"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import type { ResolvedThemeSection } from "@/lib/theme-sections/types"

interface Props {
  section: ResolvedThemeSection
}

interface FooterPaymentIconsContent {
  methods?: string[]
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  VISA: VisaIcon,
  MASTERCARD: MastercardIcon,
  YAPE: YapeIcon,
  PLIN: PlinIcon,
  PAYPAL: PayPalIcon,
}

export function FooterPaymentIcons({ section }: Props) {
  const data = section.content as FooterPaymentIconsContent
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    section.content.style,
  )
  const methods = data.methods ?? []
  return (
    <div
      className={`container mx-auto px-4 py-4 flex flex-wrap gap-3 justify-center items-center ${className}`}
      style={style}
      data-color-scheme={dataColorScheme}
    >
      {methods.map((m) => (
        <PaymentIcon key={m} method={m} />
      ))}
    </div>
  )
}

function PaymentIcon({ method }: { method: string }) {
  const Icon = ICON_MAP[method]
  if (Icon) {
    return (
      <span className="inline-flex items-center justify-center h-6">
        <Icon className="h-6 w-auto" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center h-6 px-2 rounded border text-[10px] font-semibold tracking-wide">
      {method}
    </span>
  )
}
