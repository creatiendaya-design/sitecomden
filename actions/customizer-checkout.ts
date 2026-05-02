import { validateCustomDesign, validateCustomDesignImageUrl } from "@/lib/customizer/validate";
import type { CustomDesign, CustomDesignImage } from "@/lib/customizer/types";

export interface CartItemForValidation {
  productId: string;
  customDesign?: CustomDesign;
  customDesignImages?: CustomDesignImage[];
}

export type CheckoutValidationResult =
  | { success: true }
  | { success: false; error: string };

export function validateCartItemDesign(
  item: CartItemForValidation,
  productTemplateId: string | null
): CheckoutValidationResult {
  if (!item.customDesign) return { success: true };

  if (item.customDesign.templateId !== productTemplateId) {
    return {
      success: false,
      error: "La plantilla del producto cambió desde que añadiste al carrito. Vuelve a personalizar.",
    };
  }

  const designResult = validateCustomDesign(item.customDesign);
  if (!designResult.success) return { success: false, error: designResult.error };

  if (item.customDesignImages) {
    for (const img of item.customDesignImages) {
      if (!validateCustomDesignImageUrl(img.url)) {
        return { success: false, error: "URL de imagen inválida" };
      }
    }
  }

  return { success: true };
}
