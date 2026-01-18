import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
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
        hasVariants: true,  // ← NUEVO: necesario para inventario
        variants: {         // ← NUEVO: necesario para inventario
          where: { active: true },
          select: {
            id: true,
            sku: true,
            options: true,
            stock: true,      // ← Para mostrar stock actual
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