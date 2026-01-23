import { NextRequest, NextResponse } from "next/server";
import {prisma} from "@/lib/db";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = subscribeSchema.parse(body);

    // Verificar si el email ya existe
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      // Si ya existe y está activo
      if (existing.active) {
        return NextResponse.json(
          { error: "Este correo ya está suscrito a nuestro newsletter" },
          { status: 400 }
        );
      }

      // Si existe pero está inactivo, reactivar
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: {
          active: true,
          name: name || existing.name,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      });

      return NextResponse.json({
        message: "¡Bienvenido de nuevo! Tu suscripción ha sido reactivada",
      });
    }

    // Crear nueva suscripción
    await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        name,
        active: true,
      },
    });

    // TODO: Enviar email de bienvenida con Resend
    // await sendWelcomeEmail(email, name);

    return NextResponse.json({
      message: "¡Gracias por suscribirte! Revisa tu correo para confirmar",
    });
  } catch (error) {
    console.error("Error al suscribir al newsletter:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Hubo un error al procesar tu suscripción" },
      { status: 500 }
    );
  }
}