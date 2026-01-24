import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("products.view");
  if (authResponse) return authResponse;

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        basePrice: true,
        images: true,
        active: true,
      },
      orderBy: [
        { active: "desc" }, // Activos primero
        { name: "asc" },
      ],
    });

    // Serializar precios
    const serializedProducts = products.map((product) => ({
      ...product,
      basePrice: Number(product.basePrice),
    }));

    return NextResponse.json({ products: serializedProducts });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Error al cargar productos" },
      { status: 500 }
    );
  }
}