// lib/products/shipping-restriction.ts
import type { ShippingRestriction } from "@/lib/cod-forms/types"

export type Location = {
  departmentId: string | null
  provinceId: string | null
  districtCode: string | null
}

/**
 * Returns null when the location is allowed, or the restriction message
 * (or a generic fallback) when blocked.
 *
 * Rules:
 *  - restriction null/undefined or enabled=false → always allowed.
 *  - allowedDistrictCodes non-empty → districtCode must be in it.
 *  - else allowedProvinceIds non-empty → provinceId must be in it.
 *  - else allowedDepartmentIds non-empty → departmentId must be in it.
 *  - else (all empty) → allowed.
 */
export function validateShippingRestriction(
  restriction: ShippingRestriction | null | undefined,
  loc: Location,
): string | null {
  if (!restriction || !restriction.enabled) return null

  const fail = (): string =>
    restriction.restrictionMessage ??
    "Este producto no se envía a la ubicación seleccionada."

  if (restriction.allowedDistrictCodes.length > 0) {
    if (!loc.districtCode) return fail()
    return restriction.allowedDistrictCodes.includes(loc.districtCode) ? null : fail()
  }
  if (restriction.allowedProvinceIds.length > 0) {
    if (!loc.provinceId) return fail()
    return restriction.allowedProvinceIds.includes(loc.provinceId) ? null : fail()
  }
  if (restriction.allowedDepartmentIds.length > 0) {
    if (!loc.departmentId) return fail()
    return restriction.allowedDepartmentIds.includes(loc.departmentId) ? null : fail()
  }
  return null
}
