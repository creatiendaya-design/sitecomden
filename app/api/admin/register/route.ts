import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { requireRoleLevel } from "@/lib/auth";
import { SUPER_ADMIN_LEVEL } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    // Solo Super Admins pueden crear nuevas cuentas de administrador
    const { response: authResponse } = await requireRoleLevel(SUPER_ADMIN_LEVEL);
    if (authResponse) return authResponse;

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 12 caracteres" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      );
    }

    // Siempre asignar el rol de menor privilegio — elevación requiere acción explícita
    const staffRole = await prisma.role.findFirst({
      where: { active: true },
      orderBy: { level: "asc" },
    });

    if (!staffRole) {
      return NextResponse.json(
        { error: "No hay roles disponibles. Ejecuta el seed primero." },
        { status: 500 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: staffRole.id,
        active: true,
      },
      include: { role: true },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
          ? { id: user.role.id, name: user.role.name, slug: user.role.slug, level: user.role.level }
          : null,
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