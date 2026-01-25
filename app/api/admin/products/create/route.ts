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
      imagesReceived: data.images?.length || 0,
    });

    // ✅ NORMALIZAR IMÁGENES ANTES DE VALIDAR
    // Convertir objetos { url, alt, name } a strings (solo URL)
    let normalizedImages: string[] = [];
    if (data.images && Array.isArray(data.images)) {
      normalizedImages = data.images.map((img: any) => {
        // Si es objeto con url, extraer la URL
        if (typeof img === "object" && img.url) {
          return img.url;
        }
        // Si ya es string, dejarlo como está
        if (typeof img === "string") {
          return img;
        }
        return "";
      }).filter((url: string) => url !== "");
    }

    console.log("✅ Imágenes normalizadas para validación:", normalizedImages.length);

    // ✅ NORMALIZAR DATOS ANTES DE VALIDAR
    // Si tiene variantes, el basePrice debe ser 0
    const normalizedData = {
      ...data,
      images: normalizedImages,  // ✅ Usar imágenes normalizadas (strings)
      basePrice: data.hasVariants ? 0 : (data.basePrice || 0),
      stock: data.hasVariants ? 0 : (data.stock || 0),
      sku: data.hasVariants ? null : (data.sku || null),
    };

    // ✅ VALIDACIÓN: Validar datos con Zod (ahora images son strings)
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

    // ✅ Normalizar imágenes de nuevo para guardar con metadata
    const imagesToSave = normalizeImagesForSave(validatedData.images);

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
          sku: validatedData.sku || null,
          stock: validatedData.stock || 0,
          images: imagesToSave as any,  // ✅ Cast a any para compatibilidad con Prisma Json
          active: validatedData.active ?? true,
          featured: validatedData.featured ?? false,
          hasVariants: validatedData.hasVariants,
          metaTitle: validatedData.metaTitle || null,
          metaDescription: validatedData.metaDescription || null,
          weight: validatedData.weight || null,
        },
      });

      // 2. Relacionar con categoría si se especificó
      if (validatedData.categoryId) {
        await tx.productCategory.create({
          data: {
            productId: newProduct.id,
            categoryId: validatedData.categoryId,
          },
        });
      }

      // 3. Si tiene variantes, crear opciones y variantes
      if (validatedData.hasVariants && data.options && data.variants) {
        console.log("📝 Creando opciones y variantes...");

        // Crear opciones (Color, Talla, etc.)
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
        let createdVariants = 0;
        for (const variant of data.variants) {
          // ✅ CONVERSIÓN EXPLÍCITA: Asegurar que price y stock sean números
          const variantPrice = parseFloat(variant.price);
          const variantStock = parseInt(variant.stock) || 0;

          // ✅ VALIDACIÓN: El precio debe ser mayor a 0
          if (!variantPrice || variantPrice <= 0) {
            console.error("❌ Variante sin precio válido:", variant);
            throw new Error(`Variante ${JSON.stringify(variant.options)} debe tener un precio mayor a 0`);
          }

          console.log(`  ✅ Creando variante: ${JSON.stringify(variant.options)} - Precio: ${variantPrice}`);

          // Generar SKU si no se proporcionó
          const sku = variant.sku || (() => {
            const optionValues = Object.values(variant.options).join("-");
            return `${newProduct.slug}-${optionValues}`.toUpperCase().replace(/\s+/g, "-");
          })();

          await tx.productVariant.create({
            data: {
              productId: newProduct.id,
              sku,
              options: variant.options as any,  // ✅ Cast para compatibilidad con Prisma Json
              price: variantPrice,
              compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
              stock: variantStock,
              weight: variant.weight ? parseFloat(variant.weight) : null,
              image: variant.image || null,
              active: true,
            },
          });

          createdVariants++;
        }

        console.log(`✅ Creadas ${createdVariants} variantes`);
      }

      return newProduct;
    });

    console.log(`✅ Producto creado exitosamente por usuario ${user.id}:`, product.name);

    // Obtener el producto completo con todas las relaciones
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

    // Errores personalizados (ej: variante sin precio)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}