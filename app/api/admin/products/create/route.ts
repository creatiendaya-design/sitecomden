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
      optionsCount: data.options?.length || 0, // 🆕 Log de opciones
      imagesReceived: data.images?.length || 0,
      categoryId: data.categoryId,
    });

    // ✅ NORMALIZAR IMÁGENES ANTES DE VALIDAR
    let normalizedImages: string[] = [];
    if (data.images && Array.isArray(data.images)) {
      normalizedImages = data.images.map((img: any) => {
        if (typeof img === "object" && img.url) {
          return img.url;
        }
        if (typeof img === "string") {
          return img;
        }
        return "";
      }).filter((url: string) => url !== "");
    }

    console.log("✅ Imágenes normalizadas para validación:", normalizedImages.length);

    // ✅ NORMALIZAR DATOS ANTES DE VALIDAR
    const normalizedData = {
      ...data,
      images: normalizedImages,
      basePrice: data.hasVariants ? 0 : (data.basePrice || 0),
      stock: data.hasVariants ? 0 : (data.stock || 0),
      sku: data.hasVariants ? null : (data.sku || null),
      categoryId: data.categoryId && data.categoryId.trim() !== "" ? data.categoryId : null,
    };

    console.log("✅ Datos normalizados:", {
      categoryId: normalizedData.categoryId,
      hasVariants: normalizedData.hasVariants,
    });

    // ✅ VALIDACIÓN
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

    // ✅ Normalizar imágenes para guardar
    const imagesToSave = normalizeImagesForSave(validatedData.images);

    console.log("✅ Datos validados:", {
      name: validatedData.name,
      hasVariants: validatedData.hasVariants,
      basePrice: validatedData.basePrice,
      variantsToCreate: data.variants?.length || 0,
      optionsToCreate: data.options?.length || 0, // 🆕
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
          images: imagesToSave as any,
          active: validatedData.active ?? true,
          featured: validatedData.featured ?? false,
          hasVariants: validatedData.hasVariants,
          metaTitle: validatedData.metaTitle || null,
          metaDescription: validatedData.metaDescription || null,
          weight: validatedData.weight || null,
        },
      });

      // 2. Relacionar con categoría
      if (validatedData.categoryId) {
        await tx.productCategory.create({
          data: {
            productId: newProduct.id,
            categoryId: validatedData.categoryId,
          },
        });
      }

      // 3. 🆕 Si tiene variantes, crear opciones CON SWATCHES y variantes
      if (validatedData.hasVariants && data.options && data.variants) {
        console.log("📝 Creando opciones con swatches y variantes...");

        // 🆕 Crear opciones con todos los campos de swatches
        for (let i = 0; i < data.options.length; i++) {
          const option = data.options[i];
          
          const createdOption = await tx.productOption.create({
            data: {
              productId: newProduct.id,
              name: option.name,
              displayStyle: option.displayStyle || "DROPDOWN", // 🆕 SWATCHES, BUTTONS, DROPDOWN
              position: i,
            },
          });

          // 🆕 Crear valores con swatches
          if (option.values && option.values.length > 0) {
            await tx.productOptionValue.createMany({
              data: option.values.map((value: any, j: number) => ({
                optionId: createdOption.id,
                value: typeof value === 'string' ? value : value.value, // Soporte para string o objeto
                position: j,
                swatchType: value.swatchType || "NONE", // 🆕 NONE, COLOR, IMAGE
                colorHex: value.colorHex || null, // 🆕 Color hex para swatches de color
                swatchImage: value.swatchImage || null, // 🆕 URL de imagen para swatches de patrón
              }))
            });
          }
        }

        // Crear variantes
        let createdVariants = 0;
        for (const variant of data.variants) {
          const variantPrice = parseFloat(variant.price);
          const variantStock = parseInt(variant.stock) || 0;

          if (!variantPrice || variantPrice <= 0) {
            console.error("❌ Variante sin precio válido:", variant);
            throw new Error(`Variante ${JSON.stringify(variant.options)} debe tener un precio mayor a 0`);
          }

          console.log(`  ✅ Creando variante: ${JSON.stringify(variant.options)} - Precio: ${variantPrice}`);

          const sku = variant.sku || (() => {
            const optionValues = Object.values(variant.options).join("-");
            return `${newProduct.slug}-${optionValues}`.toUpperCase().replace(/\s+/g, "-");
          })();

          await tx.productVariant.create({
            data: {
              productId: newProduct.id,
              sku,
              options: variant.options as any,
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

    // Obtener el producto completo
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

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: JSON.parse(error.message),
        },
        { status: 400 }
      );
    }

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