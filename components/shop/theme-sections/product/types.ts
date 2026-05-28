/**
 * Shape consumed by the product theme-section renderers. The data is the
 * already-serialized output of `app/(shop)/productos/[slug]/page.tsx` —
 * Decimals → numbers, Dates → strings — so client components can use it
 * without re-serializing.
 */
export interface ProductForRender {
  id: string
  name: string
  slug: string
  description: string | null
  shortDescription: string | null
  sku: string | null
  weight: number | null
  basePrice: number
  compareAtPrice: number | null
  stock: number
  hasVariants: boolean
  images: string[]
  categories: Array<{
    category: { id: string; name: string; slug: string }
  }>
}
