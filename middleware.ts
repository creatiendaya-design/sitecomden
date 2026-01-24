// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ========================================
// FUNCIONES SEPARADAS PARA CADA SISTEMA
// ========================================

// 🔒 Lógica de Admin (cookies)
function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Solo procesar rutas que empiezan con /admin
  if (!pathname.startsWith("/admin")) {
    return null;
  }

  // ✅ Rutas públicas de admin (login/register)
  if (pathname.startsWith("/admin-auth/")) {
    return NextResponse.next();
  }

  // ✅ Redirect pages (admin/login → admin-auth/login)
  if (pathname === "/admin/login" || pathname === "/admin/register") {
    return NextResponse.next();
  }

  // ✅ Root admin redirect (dejar que page.tsx lo maneje)
  if (pathname === "/admin") {
    return NextResponse.next();
  }

  // ✅ Verificar cookie admin_session para rutas protegidas
  const adminSession = req.cookies.get("admin_session");
  if (!adminSession) {
    return NextResponse.redirect(new URL("/admin-auth/login", req.url));
  }

  // ⭐ NUEVO: Agregar userId al header para verificación de permisos
  const response = NextResponse.next();
  response.headers.set("x-user-id", adminSession.value);
  return response;
}

// 🛍️ Lógica de Shop (Clerk) - rutas públicas
const isPublicRoute = createRouteMatcher([
  '/',
  '/productos(.*)',
  '/carrito(.*)',
  '/checkout(.*)',
  '/iniciar-sesion(.*)',
  '/registro(.*)',
  '/limpiar-sesion(.*)',
  '/diagnostico(.*)',
  '/sobre-nosotros(.*)',
  '/contacto(.*)',
  '/api(.*)',
]);

// ========================================
// MIDDLEWARE PRINCIPAL
// ========================================

export default clerkMiddleware((auth, req) => {
  // 1. Manejar admin primero
  const adminResult = handleAdminRoutes(req);
  if (adminResult) {
    return adminResult;
  }

  // 2. Rutas públicas de shop
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 3. Otras rutas (como /cuenta) pasan sin verificación
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};