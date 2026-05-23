import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { invalidateCategory } from "@/lib/cache/invalidate";
import { logAudit } from "@/lib/audit-log";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("categories:delete");
  if (authResponse) return authResponse;

  try {
    const { categoryId } = await params;

    console.log(`🗑️ Eliminando categoría ${categoryId} por usuario ${user.id}`);

    // Verificar si existe la categoría
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Soft-delete: tombstone + deactivate. ProductCategory join rows quedan
    // intactos pero la categoría no aparece más en el storefront porque las
    // queries ya filtran `active: true`.
    await prisma.category.update({
      where: { id: categoryId },
      data: { deletedAt: new Date(), active: false },
    });

    console.log(`✅ Categoría soft-eliminada por usuario ${user.id}:`, category.name);

    if (category._count.products > 0) {
      console.log(`ℹ️ ${category._count.products} productos siguen vinculados (tombstone preserva el join)`);
    }

    // Revalidar rutas para actualizar cache
    revalidatePath("/");
    revalidatePath("/admin/categorias");
    revalidatePath(`/productos`);
    invalidateCategory(category.slug);
    invalidateCategory(categoryId);

    await logAudit({
      action: "category.soft_deleted",
      userId: user.id,
      userEmail: user.email,
      entityType: "Category",
      entityId: categoryId,
      before: { name: category.name, slug: category.slug },
      metadata: { productCount: category._count.products },
    });

    return NextResponse.json({
      success: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    return NextResponse.json(
      { error: "Error al eliminar la categoría" },
      { status: 500 }
    );
  }
}