/**
 * Controlled vocabulary for landing template categories. Used in:
 *  - CreateTemplateDialog (category field)
 *  - EditTemplateMetadataForm (category field)
 *  - TemplateLibraryGrid filter dropdown
 *  - TemplateCard category emoji
 *
 * Adding a new category: append to TEMPLATE_CATEGORIES, give it a label and
 * an emoji. Existing free-text categories from before this controlled list
 * still render — they just don't show up as picker options.
 */
export const TEMPLATE_CATEGORIES = [
  { value: "general", label: "General", emoji: "📦" },
  { value: "electronica", label: "Electrónica", emoji: "💻" },
  { value: "moda", label: "Moda y ropa", emoji: "👕" },
  { value: "hogar", label: "Hogar y decoración", emoji: "🛋️" },
  { value: "belleza", label: "Belleza y cuidado personal", emoji: "💄" },
  { value: "deportes", label: "Deportes y aire libre", emoji: "⚽" },
  { value: "alimentos", label: "Alimentos y bebidas", emoji: "🍎" },
  { value: "infantil", label: "Bebés y niños", emoji: "🧸" },
] as const

export type TemplateCategoryValue = (typeof TEMPLATE_CATEGORIES)[number]["value"]

export function getCategoryLabel(value: string | null | undefined): string {
  if (!value) return "Sin categoría"
  const found = TEMPLATE_CATEGORIES.find((c) => c.value === value)
  return found?.label ?? value // Free-text legacy values fall through.
}

export function getCategoryEmoji(value: string | null | undefined): string {
  if (!value) return "📄"
  const found = TEMPLATE_CATEGORIES.find((c) => c.value === value)
  return found?.emoji ?? "📄"
}
