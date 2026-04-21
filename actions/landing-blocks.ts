"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { protectRoute } from "@/lib/protect-route";
import type { LandingBlockType, BlockContent } from "@/lib/types/landing-blocks";

export async function createLandingBlock(
  productId: string,
  type: LandingBlockType,
  content: BlockContent
) {
  await protectRoute("products:update");

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
