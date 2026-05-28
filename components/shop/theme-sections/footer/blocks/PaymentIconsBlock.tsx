import {
  VisaIcon,
  MastercardIcon,
  YapeIcon,
  PlinIcon,
  PayPalIcon,
} from "@/components/payment-icons"
import { SubBlockWrapper } from "../../_helpers"
import type { ResolvedThemeSectionBlock } from "@/lib/theme-sections/types"

interface Props {
  block: ResolvedThemeSectionBlock
}

interface PaymentIconsContent {
  methods?: string[]
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  VISA: VisaIcon,
  MASTERCARD: MastercardIcon,
  YAPE: YapeIcon,
  PLIN: PlinIcon,
  PAYPAL: PayPalIcon,
}

export function PaymentIconsBlock({ block }: Props) {
  const data = block.content as PaymentIconsContent
  const methods = data.methods ?? []
  return (
    <SubBlockWrapper
      block={block}
      className="flex flex-wrap gap-3 justify-center items-center"
    >
      {methods.map((m) => (
        <PaymentIcon key={m} method={m} />
      ))}
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
