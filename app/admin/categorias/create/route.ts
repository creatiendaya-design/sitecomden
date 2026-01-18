import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!data.name || !data.slug) {
      return NextResponse.json(
        { error: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el slug no exista
    const existingCategory = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese slug" },
        { status: 400 }
      );
    }

    // Crear categoría
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image: data.image || null,
        active: data.active ?? true,
        order: data.order || 0,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    );
  }
}