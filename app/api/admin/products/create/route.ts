import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeImagesForSave } from "@/lib/image-utils";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Validaciones básicas
    if (!data.name || !data.slug) {
      return NextResponse.json(
        { error: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el slug no exista
    const existingProduct = await prisma.product.findUnique({
      where: { slug: data.slug },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Ya existe un producto con ese slug" },
        { status: 400 }
      );
    }

    // Normalizar imágenes automáticamente
    const normalizedImages = normalizeImagesForSave(data.images);

    // Crear producto
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        basePrice: data.basePrice,
        compareAtPrice: data.compareAtPrice || null,
        sku: data.sku || null,
        stock: data.stock || 0,
        images: normalizedImages as any, // Cast para compatibilidad con Json
        active: data.active ?? true,
        featured: data.featured ?? false,
        hasVariants: data.hasVariants ?? false,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        // Relación con categorías (many-to-many)
        categories: data.categoryId ? {
          create: {
            categoryId: data.categoryId
          }
        } : undefined,
      },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Error al crear producto:", error);
    return NextResponse.json(
      { error: "Error al crear el producto" },
      { status: 500 }
    );
  }
}