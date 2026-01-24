import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("products.view");
  if (authResponse) return authResponse;

  try {
    const { productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        hasVariants: true,
        variants: {
          where: { active: true },
          select: {
            id: true,
            sku: true,
            options: true,
            stock: true,
          },
          orderBy: { sku: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Producto no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener producto",
      },
      { status: 500 }
    );
  }
}