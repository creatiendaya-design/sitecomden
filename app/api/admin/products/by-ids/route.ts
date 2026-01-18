import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
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
    const serializedProducts = products.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
    }));

    return NextResponse.json({ products: serializedProducts });
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}