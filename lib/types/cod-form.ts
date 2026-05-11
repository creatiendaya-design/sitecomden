// V1 form-settings shape was removed when the COD modal was migrated to the
// block-based template (see lib/cod-forms/types.ts). What survives here is
// the small set of types that the storefront still imports independently of
// the template (the CheckoutMode enum mirror, and the per-product shipping
// restriction shape used by Product.shippingRestriction).
export type CheckoutMode = "STANDARD" | "COD_ONLY" | "COD_AND_CART";

export interface ShippingRestriction {
  enabled: boolean;
  allowedDepartmentIds: string[];
  allowedProvinceIds: string[];
  allowedDistrictCodes: string[];
  restrictionMessage?: string;
}
