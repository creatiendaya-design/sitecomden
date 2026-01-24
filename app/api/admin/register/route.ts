import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Validaciones
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      );
    }

    // ⭐ NUEVO: Buscar rol por defecto (Admin o Staff)
    const defaultRole = await prisma.role.findFirst({
      where: {
        OR: [
          { slug: "admin" },      // Intentar Admin primero
          { slug: "staff" },      // Si no existe, Staff
        ],
        active: true,
      },
      orderBy: {
        level: "desc", // Obtener el de mayor nivel disponible
      },
    });

    if (!defaultRole) {
      return NextResponse.json(
        { error: "No hay roles disponibles. Ejecuta el seed primero." },
        { status: 500 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // ⭐ CAMBIO: Crear usuario con roleId
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: defaultRole.id, // ⭐ Usar roleId en lugar de role
        active: true,
      },
      include: {
        role: true, // ⭐ Incluir role en la respuesta
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        role: user.role ? {
          id: user.role.id,
          name: user.role.name,
          slug: user.role.slug,
          level: user.role.level,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}