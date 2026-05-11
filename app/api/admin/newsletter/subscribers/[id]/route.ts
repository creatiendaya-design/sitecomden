import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response: authResponse } = await requirePermission("newsletter:delete");
  if (authResponse) return authResponse;

  try {
    const { id } = await params;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "Suscriptor no encontrado" },
        { status: 404 }
      );
    }

    await prisma.newsletterSubscriber.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting newsletter subscriber:", error);
    return NextResponse.json(
      { error: "Error al eliminar suscriptor" },
      { status: 500 }
    );
  }
}
