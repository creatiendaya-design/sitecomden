import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // productId o variantId
  productId: string
  variantId?: string
  name: string
  variantName?: string
  price: number
  quantity: number
  image?: string
  maxStock: number
  options?: Record<string, string>
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items
        const existingItem = items.find((item) => item.id === newItem.id)

        if (existingItem) {
          // Incrementar cantidad si ya existe
          set({
            items: items.map((item) =>
              item.id === newItem.id
                ? {
                    ...item,
                    quantity: Math.min(item.quantity + 1, item.maxStock),
                  }
                : item
            ),
          })
        } else {
          // Agregar nuevo item
          set({
            items: [
              ...items,
              {
                ...newItem,
                quantity: 1,
              },
            ],
          })
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
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)