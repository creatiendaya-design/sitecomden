"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export interface ProductVariant {
  id: string
  productId: string
  sku: string | null
  options: Record<string, string>
  price: number
  compareAtPrice: number | null
  stock: number
  image: string | null
  active: boolean
}

export interface ProductOptionValue {
  id: string
  value: string
  position: number
  swatchType: string
  colorHex: string | null
  swatchImage: string | null
}

export interface ProductOption {
  id: string
  name: string
  displayStyle: string
  position: number
  values: ProductOptionValue[]
}

export interface ProductContextValue {
  productId: string
  productName: string
  basePrice: number
  baseComparePrice: number | null
  baseStock: number
  hasVariants: boolean
  variants: ProductVariant[]
  options: ProductOption[]
  selectedVariant: ProductVariant | null
  setSelectedVariant: (v: ProductVariant | null) => void
  selectedOptions: Record<string, string>
  setSelectedOptions: (next: Record<string, string>) => void
  quantity: number
  setQuantity: (n: number) => void
  currentPrice: number
  currentComparePrice: number | null
  currentStock: number
  /** Image shown for the current selection: the selected variant's own
   *  image when present, otherwise the product's first base image. Used by
   *  the BuyButton so cart items always carry a thumbnail. */
  currentImage: string | null
  inStock: boolean
}

const ProductCtx = createContext<ProductContextValue | null>(null)

interface ProductProviderProps {
  productId: string
  productName: string
  basePrice: number
  baseComparePrice: number | null
  baseStock: number
  /** First base image URL of the product (already normalized server-side).
   *  Falls back to this when the selected variant has no own image. */
  baseImage: string | null
  hasVariants: boolean
  variants: ProductVariant[]
  options: ProductOption[]
  children: ReactNode
}

export function ProductProvider({
  productId,
  productName,
  basePrice,
  baseComparePrice,
  baseStock,
  baseImage,
  hasVariants,
  variants,
  options,
  children,
}: ProductProviderProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  )
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({})
  const [quantity, setQuantity] = useState(1)

  const value = useMemo<ProductContextValue>(() => {
    const currentPrice = selectedVariant?.price ?? basePrice
    const currentComparePrice =
      selectedVariant?.compareAtPrice ?? baseComparePrice
    const currentStock = selectedVariant?.stock ?? baseStock
    const currentImage = selectedVariant?.image ?? baseImage
    return {
      productId,
      productName,
      basePrice,
      baseComparePrice,
      baseStock,
      hasVariants,
      variants,
      options,
      selectedVariant,
      setSelectedVariant,
      selectedOptions,
      setSelectedOptions,
      quantity,
      setQuantity,
      currentPrice,
      currentComparePrice,
      currentStock,
      currentImage,
      inStock: currentStock > 0,
    }
  }, [
    productId,
    productName,
    basePrice,
    baseComparePrice,
    baseStock,
    baseImage,
    hasVariants,
    variants,
    options,
    selectedVariant,
    selectedOptions,
    quantity,
  ])

  return <ProductCtx.Provider value={value}>{children}</ProductCtx.Provider>
}

export function useProductContext(): ProductContextValue {
  const ctx = useContext(ProductCtx)
  if (!ctx) {
    throw new Error(
      "useProductContext must be used inside a <ProductProvider>",
    )
  }
  return ctx
}
