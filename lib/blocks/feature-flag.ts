import { getSetting } from "@/lib/site-settings"

/**
 * Returns true if the new visual builder is enabled for admins.
 *
 * The flag is stored as a Setting row with key "LANDING_BUILDER_V2".
 * Default is OFF (legacy form-based editor remains active).
 *
 * Flip the flag globally by running:
 *   UPDATE "Setting" SET value = 'true' WHERE key = 'LANDING_BUILDER_V2';
 * or via /admin/configuracion/ if a UI control is added later.
 */
export async function isPageBuilderV2Enabled(): Promise<boolean> {
  const value = await getSetting("LANDING_BUILDER_V2", false)
  return value === true || value === "true"
}
