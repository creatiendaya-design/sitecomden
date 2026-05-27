"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { protectRoute } from "@/lib/protect-route";
import { getCurrentUserIdOrNull } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertKnownBlockType, type LandingBlockType, type BlockContent } from "@/lib/types/landing-blocks";
import {
  BatchRaceError,
  batchConflict,
  batchErrored,
  batchOk,
  batchUnauthorized,
  isBatchRaceError,
  precheckBatchConflicts,
  type BatchSaveResult,
} from "@/lib/concurrency/batch";

export interface LandingBlockRow {
  id: string
  type: LandingBlockType
  position: number
  content: unknown
  sourceTemplateBlockId: string | null
  detached: boolean
  /** Plan 18 — per-block optimistic-locking version. */
  version: number
}

export async function createLandingBlock(
  productId: string,
  type: LandingBlockType,
  content: BlockContent
) {
  await protectRoute("products:update");
  assertKnownBlockType(type);

  const maxPosition = await prisma.landingBlock.findFirst({
    where: { productId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const block = await prisma.landingBlock.create({
    data: {
      productId,
      type,
      position: (maxPosition?.position ?? -1) + 1,
      content: content as object,
    },
  });

  revalidatePath(`/admin/productos`);
  return { success: true, block };
}

export async function updateLandingBlock(
  blockId: string,
  content: BlockContent
) {
  await protectRoute("products:update");

  const block = await prisma.landingBlock.update({
    where: { id: blockId },
    data: { content: content as object },
  });

  revalidatePath(`/admin/productos`);
  return { success: true, block };
}

export async function deleteLandingBlock(blockId: string) {
  await protectRoute("products:update");

  await prisma.landingBlock.delete({ where: { id: blockId } });

  revalidatePath(`/admin/productos`);
  return { success: true };
}

export async function reorderLandingBlocks(
  blocks: { id: string; position: number }[]
) {
  await protectRoute("products:update");

  await prisma.$transaction(
    blocks.map(({ id, position }) =>
      prisma.landingBlock.update({ where: { id }, data: { position } })
    )
  );

  revalidatePath(`/admin/productos`);
  return { success: true };
}

/**
 * Accepts a full desired state of a product's landingBlocks and syncs
 * the DB in a single transaction: creates new, updates existing, deletes
 * missing. Used by the autosave path in ProductLandingBuilder to persist
 * changes originating from the Zustand store.
 *
 * Blocks with ids that start with "tmp-" are treated as new (to be created
 * with fresh cuids). All other ids are treated as existing.
 */
export async function syncProductLandingBlocks(
  productId: string,
  desired: Array<{
    id: string
    type: LandingBlockType
    position: number
    content: unknown // content is persisted as Json — TS type is irrelevant at runtime
    sourceTemplateBlockId?: string | null
    detached?: boolean
  }>
) {
  await protectRoute("products:update");
  for (const b of desired) assertKnownBlockType(b.type);

  const existing = await prisma.landingBlock.findMany({
    where: { productId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((r) => r.id));
  const desiredPersistentIds = new Set(
    desired.filter((b) => !b.id.startsWith("tmp-")).map((b) => b.id)
  );

  const toDelete = [...existingIds].filter((id) => !desiredPersistentIds.has(id));
  const toCreate = desired.filter((b) => b.id.startsWith("tmp-"));
  const toUpdate = desired.filter(
    (b) => !b.id.startsWith("tmp-") && existingIds.has(b.id)
  );

  const result = await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.landingBlock.deleteMany({ where: { id: { in: toDelete } } });
    }

    const created = await Promise.all(
      toCreate.map((b) =>
        tx.landingBlock.create({
          data: {
            productId,
            type: b.type,
            position: b.position,
            content: b.content as object,
            sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
            detached: b.detached ?? false,
          },
        })
      )
    );

    await Promise.all(
      toUpdate.map((b) =>
        tx.landingBlock.update({
          where: { id: b.id },
          data: {
            type: b.type,
            position: b.position,
            content: b.content as object,
            sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
            detached: b.detached ?? false,
          },
        })
      )
    );

    return { created, updatedCount: toUpdate.length, deletedCount: toDelete.length };
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath(`/admin/productos`);

  // Map tmp ids to real cuids for the client to reconcile
  const tmpToReal: Record<string, string> = {};
  toCreate.forEach((b, i) => {
    tmpToReal[b.id] = result.created[i].id;
  });

  return { success: true, tmpToReal };
}

/**
 * Plan 18 — version-aware variant of `syncProductLandingBlocks`. Each
 * existing block carries its `version`; new "tmp-…" blocks omit it.
 * All-or-nothing on conflict.
 */
export async function syncProductLandingBlocksVersioned(
  productId: string,
  desired: Array<{
    id: string
    type: LandingBlockType
    position: number
    content: unknown
    sourceTemplateBlockId?: string | null
    detached?: boolean
    version?: number
  }>,
): Promise<
  BatchSaveResult<
    {
      blocks: LandingBlockRow[]
      tmpToReal: Record<string, string>
    },
    LandingBlockRow
  >
> {
  const userId = await getCurrentUserIdOrNull()
  if (!userId) return batchUnauthorized()
  const allowed = await hasPermission(userId, "products:update")
  if (!allowed) return batchUnauthorized()

  for (const b of desired) assertKnownBlockType(b.type)

  const conflicts = await precheckBatchConflicts({
    model: prisma.landingBlock,
    rows: desired.map((b) => ({ id: b.id, version: b.version })),
    refetchForConflict: async (id) => {
      const fresh = await prisma.landingBlock.findUnique({ where: { id } })
      if (!fresh) return null
      return {
        id: fresh.id,
        type: fresh.type,
        position: fresh.position,
        content: fresh.content,
        sourceTemplateBlockId: fresh.sourceTemplateBlockId,
        detached: fresh.detached,
        version: fresh.version,
      } satisfies LandingBlockRow
    },
  })
  if (conflicts.length > 0) return batchConflict(conflicts)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.landingBlock.findMany({
        where: { productId },
        select: { id: true },
      })
      const existingIds = new Set(existing.map((r) => r.id))
      const desiredPersistentIds = new Set(
        desired.filter((b) => !b.id.startsWith("tmp-")).map((b) => b.id),
      )

      const toDelete = [...existingIds].filter(
        (id) => !desiredPersistentIds.has(id),
      )
      if (toDelete.length > 0) {
        await tx.landingBlock.deleteMany({ where: { id: { in: toDelete } } })
      }

      const tmpToReal: Record<string, string> = {}

      for (const b of desired) {
        const isNew = b.id.startsWith("tmp-") || !existingIds.has(b.id)
        if (isNew) {
          const created = await tx.landingBlock.create({
            data: {
              productId,
              type: b.type,
              position: b.position,
              content: b.content as object,
              sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
              detached: b.detached ?? false,
            },
          })
          if (b.id.startsWith("tmp-")) tmpToReal[b.id] = created.id
        } else {
          if (typeof b.version !== "number") {
            throw new BatchRaceError(b.id)
          }
          const upd = await tx.landingBlock.updateMany({
            where: { id: b.id, version: b.version },
            data: {
              type: b.type,
              position: b.position,
              content: b.content as object,
              sourceTemplateBlockId: b.sourceTemplateBlockId ?? null,
              detached: b.detached ?? false,
              version: { increment: 1 },
            },
          })
          if (upd.count === 0) throw new BatchRaceError(b.id)
        }
      }

      const persisted = await tx.landingBlock.findMany({
        where: { productId },
        orderBy: { position: "asc" },
      })

      return { tmpToReal, persisted }
    })

    revalidatePath(`/admin/productos/${productId}`)
    revalidatePath(`/admin/productos`)

    return batchOk<
      { blocks: LandingBlockRow[]; tmpToReal: Record<string, string> },
      LandingBlockRow
    >({
      blocks: result.persisted.map((b) => ({
        id: b.id,
        type: b.type,
        position: b.position,
        content: b.content,
        sourceTemplateBlockId: b.sourceTemplateBlockId,
        detached: b.detached,
        version: b.version,
      })),
      tmpToReal: result.tmpToReal,
    })
  } catch (err) {
    if (isBatchRaceError(err)) {
      const fresh = await prisma.landingBlock.findUnique({
        where: { id: err.rowId },
      })
      return batchConflict<LandingBlockRow>([
        {
          rowId: err.rowId,
          current: fresh
            ? {
                id: fresh.id,
                type: fresh.type,
                position: fresh.position,
                content: fresh.content,
                sourceTemplateBlockId: fresh.sourceTemplateBlockId,
                detached: fresh.detached,
                version: fresh.version,
              }
            : null,
          serverVersion: fresh?.version ?? null,
        },
      ])
    }
    return batchErrored(
      err instanceof Error ? err.message : "Error al guardar bloques",
    )
  }
}
