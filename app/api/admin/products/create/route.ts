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

    console.log("📦 Datos recibidos para crear producto:", {
      name: data.name,
      hasVariants: data.hasVariants,
      basePrice: data.basePrice,
      variantsCount: data.variants?.length || 0,
    });

    // ✅ NORMALIZAR DATOS ANTES DE VALIDAR
    // Si tiene variantes, el basePrice debe ser 0
    const normalizedData = {
      ...data,
      basePrice: data.hasVariants ? 0 : (data.basePrice || 0),
      stock: data.hasVariants ? 0 : (data.stock || 0),
      sku: data.hasVariants ? null : (data.sku || null),
    };

    // ✅ VALIDACIÓN: Validar datos con Zod
    const validatedData = createProductSchema.parse(normalizedData);

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

    console.log("✅ Datos validados:", {
      name: validatedData.name,
      hasVariants: validatedData.hasVariants,
      basePrice: validatedData.basePrice,
      variantsToCreate: data.variants?.length || 0,
    });

    // ✅ Crear producto con transacción
    const product = await prisma.$transaction(async (tx) => {
      // 1. Crear producto base
      const newProduct = await tx.product.create({
        data: {
          name: validatedData.name,
          slug: validatedData.slug,
          description: validatedData.description || null,
          shortDescription: validatedData.shortDescription || null,
          basePrice: validatedData.basePrice,
          compareAtPrice: validatedData.compareAtPrice || null,
          sku: validatedData.hasVariants ? null : validatedData.sku || null,
          stock: validatedData.hasVariants ? 0 : validatedData.stock || 0,
          images: normalizedImages as any,
          active: validatedData.active ?? true,
          featured: validatedData.featured ?? false,
          hasVariants: validatedData.hasVariants ?? false,
          metaTitle: validatedData.metaTitle || null,
          metaDescription: validatedData.metaDescription || null,
          weight: validatedData.weight || null,
          // Relación con categorías (many-to-many)
          categories: validatedData.categoryId
            ? {
                create: {
                  categoryId: validatedData.categoryId,
                },
              }
            : undefined,
        },
      });

      // 2. Si tiene variantes, crear opciones y variantes
      if (validatedData.hasVariants && data.options && data.variants) {
        console.log("📝 Creando opciones y variantes...");

        // Crear opciones
        for (let i = 0; i < data.options.length; i++) {
          const option = data.options[i];
          await tx.productOption.create({
            data: {
              productId: newProduct.id,
              name: option.name,
              position: i,
              values: {
                create: option.values.map((value: string, j: number) => ({
                  value,
                  position: j,
                })),
              },
            },
          });
        }

        // Crear variantes
        for (const variant of data.variants) {
          // Generar SKU automático si no se proporciona
          const variantSku =
            variant.sku ||
            `${newProduct.slug}-${Object.values(variant.options)
              .join("-")
              .toLowerCase()
              .replace(/\s+/g, "-")}`;

          await tx.productVariant.create({
            data: {
              productId: newProduct.id,
              sku: variantSku,
              options: variant.options,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice || null,
              stock: variant.stock || 0,
              weight: variant.weight || null,
              image: variant.image || null,
              active: true,
            },
          });
        }

        console.log(`✅ Creadas ${data.variants.length} variantes`);
      }

      return newProduct;
    });

    console.log(`✅ Producto creado exitosamente por usuario ${user.id}:`, product.name);

    // Obtener producto completo con relaciones
    const completeProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        options: {
          include: {
            values: {
              orderBy: { position: "asc" },
            },
          },
          orderBy: { position: "asc" },
        },
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, product: completeProduct });
  } catch (error) {
    console.error("❌ Error al crear producto:", error);

    // Manejo de errores de validación Zod
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: JSON.parse(error.message),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear el producto" },
      { status: 500 }
    );
  }
}