import { NextRequest, NextResponse } from "next/server";
import {prisma} from "@/lib/db";
import { z } from "zod";

const unsubscribeSchema = z.object({
  email: z.string().email("Email inválido"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = unsubscribeSchema.parse(body);

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: "No encontramos este correo en nuestra lista" },
        { status: 404 }
      );
    }

    if (!subscriber.active) {
      return NextResponse.json(
        { error: "Este correo ya no está suscrito" },
        { status: 400 }
      );
    }

    // Marcar como inactivo
    await prisma.newsletterSubscriber.update({
      where: { email: email.toLowerCase() },
      data: {
        active: false,
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Lamentamos verte partir. Tu suscripción ha sido cancelada",
    });
  } catch (error) {
    console.error("Error al cancelar suscripción:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Hubo un error al procesar tu solicitud" },
      { status: 500 }
    );
  }
}