import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ products: [] });
    }

    // Buscar productos por nombre o descripción
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { shortDescription: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 8, // Máximo 8 resultados en el dropdown
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serializar precios
    const serializedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      basePrice: Number(product.basePrice),
      images: product.images,
      category: product.category,
    }));

    return NextResponse.json({ products: serializedProducts });
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Error al buscar productos" },
      { status: 500 }
    );
  }
}