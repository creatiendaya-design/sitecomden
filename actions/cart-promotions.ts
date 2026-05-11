"use server";

import {
  getActiveFreeGiftPromotionsForCart,
  type CartFreeGiftPromotion,
} from "@/lib/promotions/server";

/** Public server action used by the cart UI to preview which FREE_GIFT
 *  promotions are unlocked or close to unlocking. No auth — promotion
 *  metadata is already public on the storefront. */
export async function getCartFreeGifts(
  cartProductIds: string[]
): Promise<CartFreeGiftPromotion[]> {
  return getActiveFreeGiftPromotionsForCart(cartProductIds);
}
