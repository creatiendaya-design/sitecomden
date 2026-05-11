import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomDesign, CustomDesignImage } from '@/lib/customizer/types'

export interface AppliedPromotion {
  promotionId: string
  type: 'VOLUME' | 'BUNDLE'
  tierLabel: string
  discountPerUnit: number
  originalUnitPrice: number
}

export interface SubscriptionOptIn {
  promotionId: string
  email: string
  /** Snapshot for client-side display only. Server re-resolves from DB. */
  discountPerUnit: number
}

export interface CartItem {
  id: string // productId o variantId
  productId: string
  variantId?: string
  name: string
  variantName?: string
  slug: string // ✨ NUEVO: Para navegación directa al producto
  /** Final per-unit price. ALL discounts (volume / bundle / subscription)
   *  are already subtracted from this number — this is what we multiply
   *  by quantity for the cart total. */
  price: number
  /** Gross per-unit price before any discount applied. Used to render
   *  the tachado line and to derive the discount amount. Optional to keep
   *  backward-compat with cart items persisted before this field existed. */
  originalUnitPrice?: number
  quantity: number
  image?: string
  maxStock: number
  options?: Record<string, string>
  customDesignId?: string
  customDesign?: CustomDesign
  customDesignImages?: CustomDesignImage[]
  customDesignBroken?: boolean
  appliedPromotion?: AppliedPromotion
  subscriptionOptIn?: SubscriptionOptIn
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => boolean
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  /** Suma del precio original (sin promociones aplicadas) × qty para todos los items. */
  getOriginalSubtotal: () => number
  /** Suma de descuentos aplicados sobre todos los items (originalUnitPrice − price) × qty. */
  getTotalDiscount: () => number
  // ✨ NUEVOS helpers opcionales:
  getItemCount: (id: string) => number
  isInCart: (id: string) => boolean
  canAddMore: (id: string) => boolean
  replaceCustomItem: (cartItemId: string, design: CustomDesign, images: CustomDesignImage[]) => void
  markCustomDesignBroken: (cartItemId: string, broken: boolean) => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem, quantity = 1) => {
        const safeQty = Math.max(1, Math.floor(quantity))
        const items = get().items
        const existingItem = items.find((item) => item.id === newItem.id)

        if (existingItem) {
          if (existingItem.quantity >= existingItem.maxStock) {
            console.warn(`Stock máximo alcanzado para ${newItem.name}`)
            return false
          }

          const targetQty = Math.min(existingItem.quantity + safeQty, existingItem.maxStock)
          set({
            items: items.map((item) =>
              item.id === newItem.id
                ? {
                    ...item,
                    quantity: targetQty,
                    appliedPromotion: newItem.appliedPromotion ?? item.appliedPromotion,
                    price: newItem.appliedPromotion ? newItem.price : item.price,
                  }
                : item
            ),
          })
          return true
        } else {
          if (newItem.maxStock <= 0) {
            console.warn(`No hay stock disponible para ${newItem.name}`)
            return false
          }

          set({
            items: [
              ...items,
              {
                ...newItem,
                quantity: Math.min(safeQty, newItem.maxStock),
              },
            ],
          })
          return true
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id)
          return
        }

        set({
          items: get().items.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.min(quantity, item.maxStock) }
              : item
          ),
        })
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalPrice: () => {
        // item.price already has every applicable discount baked in, so we
        // just multiply by quantity.
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
      },

      getOriginalSubtotal: () => {
        return get().items.reduce((total, item) => {
          const unit = item.originalUnitPrice ?? item.price
          return total + unit * item.quantity
        }, 0)
      },

      getTotalDiscount: () => {
        return get().items.reduce((total, item) => {
          const original = item.originalUnitPrice ?? item.price
          return total + (original - item.price) * item.quantity
        }, 0)
      },

      // ✨ NUEVO: Obtener cantidad de un item específico
      getItemCount: (id) => {
        const item = get().items.find((item) => item.id === id)
        return item?.quantity || 0
      },

      // ✨ NUEVO: Verificar si un item está en el carrito
      isInCart: (id) => {
        return get().items.some((item) => item.id === id)
      },

      // ✨ NUEVO: Verificar si se puede agregar más de un item
      canAddMore: (id) => {
        const item = get().items.find((item) => item.id === id)
        if (!item) return true // Si no está en carrito, se puede agregar
        return item.quantity < item.maxStock
      },

      replaceCustomItem: (cartItemId, design, images) => {
        set({
          items: get().items.map((item) =>
            item.id === cartItemId
              ? { ...item, customDesign: design, customDesignImages: images, customDesignBroken: false }
              : item
          ),
        })
      },

      markCustomDesignBroken: (cartItemId, broken) => {
        set({
          items: get().items.map((item) =>
            item.id === cartItemId ? { ...item, customDesignBroken: broken } : item
          ),
        })
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)