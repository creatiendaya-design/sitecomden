import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { withRateLimit, loginRateLimiter, getClientIp } from "@/lib/rate-limit";
import { createAdminSession } from "@/lib/admin-session";
import { logAudit } from "@/lib/audit-log";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "admin-login" });

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await withRateLimit(request, loginRateLimiter, {
      action: "admin_login",
      errorMessage: "Demasiados intentos de login. Intenta nuevamente en 15 minutos.",
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña requeridos" },
        { status: 400 }
      );
    }

    // ⭐ CAMBIO 1: Incluir relación role
    // Soft-delete: tombstoned users (deletedAt != null) tampoco pueden loguearse.
    const user = await prisma.user.findFirst({
      where: { email, active: true, deletedAt: null },
      include: {
        role: true, // ⭐ AGREGAR ESTO
      },
    });

    if (!user) {
      await logAudit({
        action: "admin.login.failed",
        userEmail: typeof email === "string" ? email : null,
        metadata: { reason: "user_not_found" },
      });
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Verificar contraseña con bcrypt
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      await logAudit({
        action: "admin.login.failed",
        userId: user.id,
        userEmail: user.email,
        metadata: { reason: "bad_password" },
      });
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Crear sesión server-side (token opaco) y entregar el token en la cookie
    const sessionToken = await createAdminSession(user.id, {
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    const cookieStore = await cookies();
    cookieStore.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    await logAudit({
      action: "admin.login.success",
      userId: user.id,
      userEmail: user.email,
      metadata: { roleId: user.roleId ?? null },
    });

    // ⭐ CAMBIO 2: Actualizar respuesta con nuevo formato
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId, // ⭐ Agregar roleId
        role: user.role ? { // ⭐ Cambiar esto
          id: user.role.id,
          name: user.role.name,
          slug: user.role.slug,
          level: user.role.level,
        } : null,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin login failed");
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}