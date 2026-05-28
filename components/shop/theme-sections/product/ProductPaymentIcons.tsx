import {
  VisaIcon,
  MastercardIcon,
  YapeIcon,
  PlinIcon,
  PayPalIcon,
} from "@/components/payment-icons"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"
import { applyThemeSectionStyle } from "@/lib/theme-sections/apply-style"
import { SubBlockWrapper } from "../_helpers"

interface ProductPaymentIconsProps {
  block: ResolvedThemeSectionBlock
}

interface ProductPaymentIconsContent {
  heading?: string
  methods?: string[]
  align?: "start" | "center" | "end"
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  VISA: VisaIcon,
  MASTERCARD: MastercardIcon,
  YAPE: YapeIcon,
  PLIN: PlinIcon,
  PAYPAL: PayPalIcon,
}

const ALIGN_CLASS: Record<NonNullable<ProductPaymentIconsContent["align"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
}

export function ProductPaymentIcons({ block }: ProductPaymentIconsProps) {
  const content = block.content as ProductPaymentIconsContent
  const heading = content.heading?.trim() ?? ""
  const methods = content.methods ?? []
  const align = content.align ?? "start"
  const { className, style, dataColorScheme } = applyThemeSectionStyle(
    block.content.style,
  )

  if (methods.length === 0 && !heading) return null

  return (
    <SubBlockWrapper
      block={block}
      className={className}
      style={style}
      colorScheme={dataColorScheme}
    >
      <div className={`flex flex-wrap items-center gap-2 ${ALIGN_CLASS[align]}`}>
        {heading && (
          <span
            className="text-xs uppercase tracking-wide opacity-70 mr-1"
            data-content-field="heading"
          >
            {heading}
          </span>
        )}
        {methods.map((m) => (
          <PaymentIcon key={m} method={m} />
        ))}
      </div>
    </SubBlockWrapper>
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
