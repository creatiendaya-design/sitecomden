import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // productId o variantId
  productId: string
  variantId?: string
  name: string
  variantName?: string
  slug: string // ✨ NUEVO: Para navegación directa al producto
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
  // ✨ NUEVOS helpers opcionales:
  getItemCount: (id: string) => number
  isInCart: (id: string) => boolean
  canAddMore: (id: string) => boolean
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const items = get().items
        const existingItem = items.find((item) => item.id === newItem.id)

        if (existingItem) {
          // Verificar si puede agregar más
          if (existingItem.quantity >= existingItem.maxStock) {
            // ✨ MEJORA: Retornar false cuando llegue al límite
            console.warn(`Stock máximo alcanzado para ${newItem.name}`)
            return false
          }
          
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
          return true
        } else {
          // ✨ MEJORA: Validar stock antes de agregar
          if (newItem.maxStock <= 0) {
            console.warn(`No hay stock disponible para ${newItem.name}`)
            return false
          }
          
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
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
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
    }),
    {
      name: 'cart-storage',
    }
  )
)