import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("products.view");
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        products: [],
      });
    }

    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        basePrice: true,
        images: true,
        active: true,
        hasVariants: true,
        variants: {
          where: { active: true },
          select: {
            id: true,
            sku: true,
            options: true,
            stock: true,
          },
        },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    // Serializar precios
    const serializedProducts = products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
    }));

    return NextResponse.json({ 
      success: true,
      products: serializedProducts 
    });
  } catch (error) {
    console.error("Error buscando productos:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Error al buscar productos",
        products: [] 
      },
      { status: 500 }
    );
  }
}