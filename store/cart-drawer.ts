import { create } from "zustand";

/**
 * Global open/close state for the general (non-COD) cart drawer. Kept separate
 * from the cart store so opening the drawer doesn't re-render cart consumers,
 * and so the header button, add-to-cart buttons, and product cards can all
 * trigger it from anywhere.
 */
interface CartDrawerStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (v: boolean) => void;
}

export const useCartDrawer = create<CartDrawerStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (v) => set({ isOpen: v }),
}));
