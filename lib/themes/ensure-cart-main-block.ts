import { prisma } from "@/lib/db"
import { DEFAULT_CONTENT_V2 } from "@/lib/blocks/defaults"

/**
 * Backfill helper. Cart pages created before the CART_MAIN block existed
 * have no skeleton — the customizer's sidebar would surface only the
 * decorative blocks (Ticker, Trust Badges, etc.) and no entry to edit the
 * cart UI itself. Calling this at the customizer's data-fetch boundary
 * appends a CART_MAIN block at the end of the page so the admin can pick
 * it up on the very next render.
 *
 * Idempotent: when a CART_MAIN block already exists for the page, returns
 * its id and writes nothing. Positioned at the end so any existing
 * decorative blocks keep painting above the cart UI by default — the
 * admin can drag CART_MAIN earlier to push them below.
 *
 * NOT exported as a Server Action — it's a server-only library function
 * called from the customizer's Server Component data-fetch, so the
 * surrounding `protectRoute("themes:update")` (already enforced by the
 * caller) is the auth gate. Adding `"use server"` would force a callable
 * RPC surface we don't need.
 */
export async function ensureCartMainBlock(pageId: string): Promise<string> {
  const existing = await prisma.pageBlock.findFirst({
    where: { pageId, type: "CART_MAIN" },
    select: { id: true },
  })
  if (existing) return existing.id

  const last = await prisma.pageBlock.findFirst({
    where: { pageId },
    orderBy: { position: "desc" },
    select: { position: true },
  })
  const nextPosition = (last?.position ?? -1) + 1

  const created = await prisma.pageBlock.create({
    data: {
      pageId,
      type: "CART_MAIN",
      position: nextPosition,
      content: DEFAULT_CONTENT_V2.CART_MAIN as object,
    },
    select: { id: true },
  })
  return created.id
}
