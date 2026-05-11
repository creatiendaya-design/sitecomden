// components/shop/cod-form/blocks/FieldBlock.tsx
"use client"

import {
  AlertCircle,
  IdCard,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  User,
  type LucideIcon,
} from "lucide-react"
import type { CodFormBlockType, FieldContent } from "@/lib/cod-forms/types"

const TEXTAREA_TYPES: ReadonlySet<CodFormBlockType> = new Set([
  "FIELD_REFERENCE",
  "FIELD_NOTES",
])

const HTML_INPUT_TYPE: Partial<Record<CodFormBlockType, string>> = {
  FIELD_EMAIL: "email",
  FIELD_PHONE: "tel",
  FIELD_DNI: "text",
}

const HTML_INPUT_MODE: Partial<
  Record<CodFormBlockType, "tel" | "numeric" | "email" | "text">
> = {
  FIELD_PHONE: "tel",
  FIELD_DNI: "numeric",
  FIELD_EMAIL: "email",
}

const HTML_AUTOCOMPLETE: Partial<Record<CodFormBlockType, string>> = {
  FIELD_NAME: "name",
  FIELD_PHONE: "tel",
  FIELD_EMAIL: "email",
  FIELD_ADDRESS: "street-address",
  FIELD_ADDRESS_2: "address-line2",
}

const FIELD_ICON: Partial<Record<CodFormBlockType, LucideIcon>> = {
  FIELD_NAME: User,
  FIELD_PHONE: Phone,
  FIELD_EMAIL: Mail,
  FIELD_DNI: IdCard,
  FIELD_ADDRESS: MapPin,
  FIELD_ADDRESS_2: Home,
  FIELD_REFERENCE: Navigation,
  FIELD_NOTES: MessageSquare,
}

interface FieldBlockProps {
  type: CodFormBlockType
  content: FieldContent
  required: boolean
  value: string
  errorMessage: string | null
  onChange: (v: string) => void
  onBlur?: () => void
}

const PHONE_MAX_DIGITS = 9
const DNI_MAX_DIGITS = 8

function formatPhoneDisplay(digits: string): string {
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export default function FieldBlock({
  type,
  content,
  required,
  value,
  errorMessage,
  onChange,
  onBlur,
}: FieldBlockProps) {
  const isTextarea = TEXTAREA_TYPES.has(type)
  const isPhone = type === "FIELD_PHONE"
  const isDni = type === "FIELD_DNI"
  const inputType = HTML_INPUT_TYPE[type] ?? "text"
  const Icon = FIELD_ICON[type]
  const hasError = Boolean(errorMessage)
  const showLabel = !content.hideLabel && Boolean(content.label)
  const fieldId = `cod-${type.toLowerCase()}`

  const displayValue = isPhone ? formatPhoneDisplay(value) : value
  const inputMaxLength = isPhone
    ? PHONE_MAX_DIGITS + 2 // 9 digits + 2 spaces
    : isDni
      ? DNI_MAX_DIGITS
      : undefined

  function handleInputChange(raw: string) {
    if (isPhone) {
      onChange(raw.replace(/\D/g, "").slice(0, PHONE_MAX_DIGITS))
      return
    }
    if (isDni) {
      onChange(raw.replace(/\D/g, "").slice(0, DNI_MAX_DIGITS))
      return
    }
    onChange(raw)
  }

  // Single-space placeholder makes peer-placeholder-shown reflect emptiness
  // while we use a separate floating label.
  const placeholderForInput = showLabel
    ? " "
    : (content.placeholder ?? " ")

  const wrapperState = hasError
    ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-100"
    : "border-gray-200 focus-within:border-primary focus-within:ring-primary/15"

  const iconColor = hasError
    ? "text-red-500"
    : "text-gray-400 peer-focus:text-primary"

  const labelColor = hasError
    ? "text-red-500 peer-focus:text-red-500"
    : "text-gray-500 peer-focus:text-primary"

  // Floating-label states:
  // - default (floated): small uppercase tag near the top
  // - peer-placeholder-shown (empty + not focused): looks like a placeholder
  // - peer-focus (always overrides placeholder-shown): forced floated
  const labelBase = `
    pointer-events-none absolute select-none transition-all duration-150
    ${Icon ? "left-11" : "left-4"}
    top-1.5 text-[10px] font-semibold uppercase tracking-wider
    ${labelColor}
    peer-focus:top-1.5 peer-focus:translate-y-0
    peer-focus:text-[10px] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wider
  `
  const labelPlaceholder = isTextarea
    ? "peer-placeholder-shown:top-5 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-gray-400"
    : "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-gray-400"

  return (
    <div className="space-y-1">
      <div
        className={`relative overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all duration-150 focus-within:ring-4 focus-within:shadow-none ${wrapperState}`}
      >
        {isTextarea ? (
          <textarea
            id={fieldId}
            placeholder={placeholderForInput}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            required={required}
            autoComplete={HTML_AUTOCOMPLETE[type]}
            rows={3}
            className={`cod-no-autofill peer block w-full resize-none bg-transparent text-sm text-gray-900 placeholder:text-transparent focus:outline-none ${
              Icon ? "pl-11" : "pl-4"
            } pr-4 pt-6 pb-2`}
          />
        ) : (
          <input
            id={fieldId}
            type={inputType}
            inputMode={HTML_INPUT_MODE[type]}
            placeholder={placeholderForInput}
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={onBlur}
            required={required}
            autoComplete={HTML_AUTOCOMPLETE[type]}
            maxLength={inputMaxLength}
            className={`cod-no-autofill peer block h-12 w-full bg-transparent text-sm text-gray-900 placeholder:text-transparent focus:outline-none ${
              Icon ? "pl-11" : "pl-4"
            } pr-10 pt-4`}
          />
        )}

        {showLabel && (
          <label
            htmlFor={fieldId}
            className={`${labelBase} ${labelPlaceholder}`}
          >
            {content.label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}

        {Icon && (
          <Icon
            aria-hidden
            className={`absolute h-4 w-4 transition-colors ${
              isTextarea ? "left-3.5 top-5" : "left-3.5 top-1/2 -translate-y-1/2"
            } ${iconColor}`}
          />
        )}

        {!isTextarea && hasError && (
          <AlertCircle
            aria-hidden
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500"
          />
        )}
      </div>

      {errorMessage && (
        <p className="ml-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {errorMessage}
        </p>
      )}
    </div>
  )
}
