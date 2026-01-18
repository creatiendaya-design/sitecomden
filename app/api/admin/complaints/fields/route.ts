import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// GET - Obtener todos los campos ← ESTO FALTABA ✨
export async function GET(request: Request) {
  try {
    const fields = await prisma.complaintFormField.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      success: true,
      fields: fields,
    });
  } catch (error) {
    console.error("Error fetching complaint fields:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener los campos",
      },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo campo (ya lo tenías)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.label || !body.fieldType) {
      return NextResponse.json(
        { success: false, error: "Label y fieldType son obligatorios" },
        { status: 400 }
      );
    }

    const lastField = await prisma.complaintFormField.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (lastField?.order || 0) + 1;

    const field = await prisma.complaintFormField.create({
      data: {
        label: body.label,
        fieldType: body.fieldType,
        section: body.section || null,
        width: body.width || "full",
        placeholder: body.placeholder || null,
        helpText: body.helpText || null,
        required: body.required || false,
        options: body.options || null,
        otherLabel: body.otherLabel || null,
        minLength: body.minLength || null,
        maxLength: body.maxLength || null,
        pattern: body.pattern || null,
        order: body.order !== undefined ? body.order : nextOrder,
        active: true,
      },
    });

    revalidatePath("/admin/libro-reclamaciones");
    revalidatePath("/libro-reclamaciones");

    return NextResponse.json({ success: true, data: field });
  } catch (error) {
    console.error("Error creating complaint field:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear el campo" },
      { status: 500 }
    );
  }
}