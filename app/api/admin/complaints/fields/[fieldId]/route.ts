import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const { fieldId } = await params;

    const field = await prisma.complaintFormField.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      return NextResponse.json(
        {
          success: false,
          error: "Campo no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      field,
    });
  } catch (error) {
    console.error("Error fetching complaint field:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener campo",
      },
      { status: 500 }
    );
  }
}