import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("products.view");
  if (authResponse) return authResponse;

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids)) {
      return NextResponse.json(
        { error: "IDs debe ser un array" },
        { status: 400 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        basePrice: true,
        images: true,
        active: true,
      },
      orderBy: { name: "asc" },
    });

    // Serializar precios
    const serializedProducts = products.map((product) => ({
      ...product,
      basePrice: Number(product.basePrice),
    }));

    return NextResponse.json({ products: serializedProducts });
  } catch (error) {
    console.error("Error fetching products by ids:", error);
    return NextResponse.json(
      { error: "Error al cargar productos" },
      { status: 500 }
    );
  }
}