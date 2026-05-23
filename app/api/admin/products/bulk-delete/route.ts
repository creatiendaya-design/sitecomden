import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { invalidateProduct } from "@/lib/cache/invalidate";
import { logAudit } from "@/lib/audit-log";

export async function DELETE(request: Request) {
  const { user, response: authResponse } = await requirePermission("products:delete");
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos un ID" }, { status: 400 });
    }

    if (ids.length > 200) {
      return NextResponse.json({ error: "Máximo 200 productos por operación" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true },
    });

    const foundIds = products.map((p) => p.id);

    await prisma.product.deleteMany({ where: { id: { in: foundIds } } });

    revalidatePath("/admin/productos");
    products.forEach((p) => {
      revalidatePath(`/productos/${p.slug}`);
      invalidateProduct(p.slug);
    });

    await logAudit({
      action: "product.bulk_deleted",
      userId: user.id,
      userEmail: user.email,
      entityType: "Product",
      metadata: {
        deletedCount: foundIds.length,
        requestedCount: ids.length,
        productIds: foundIds,
        productSlugs: products.map((p) => p.slug),
      },
    });

    return NextResponse.json({ success: true, deleted: foundIds.length });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar productos" }, { status: 500 });
  }
}
