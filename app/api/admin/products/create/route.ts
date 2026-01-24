import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createProductSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";
import { normalizeImagesForSave } from "@/lib/image-utils";

export async function POST(request: Request) {
  // 🔐 PROTECCIÓN: Verificar autenticación y permiso
  const { user, response: authResponse } = await requirePermission("products.create");
  if (authResponse) return authResponse;

  try {
    const data = await request.json();

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = createProductSchema.parse(data);

    // Verificar que el slug no exista
    const existingProduct = await prisma.product.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "Ya existe un producto con ese slug" },
        { status: 400 }
      );
    }

    // Normalizar imágenes automáticamente
    const normalizedImages = normalizeImagesForSave(validatedData.images);

    // Crear producto
    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description || null,
        shortDescription: validatedData.shortDescription || null,
        basePrice: validatedData.basePrice,
        compareAtPrice: validatedData.compareAtPrice || null,
        sku: validatedData.sku || null,
        stock: validatedData.stock || 0,
        images: normalizedImages as any,
        active: validatedData.active ?? true,
        featured: validatedData.featured ?? false,
        hasVariants: validatedData.hasVariants ?? false,
        metaTitle: validatedData.metaTitle || null,
        metaDescription: validatedData.metaDescription || null,
        // Relación con categorías (many-to-many)
        categories: validatedData.categoryId ? {
          create: {
            categoryId: validatedData.categoryId
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

    console.log(`✅ Producto creado por usuario ${user.id}:`, product.name);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Error al crear producto:", error);
    
    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Datos inválidos", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear el producto" },
      { status: 500 }
    );
  }
}