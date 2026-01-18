import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ========================================
// FUNCIONES SEPARADAS PARA CADA SISTEMA
// ========================================

// 🔒 Lógica de Admin (cookies)
function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return null; // No es ruta de admin
  }

  // /admin/login es público
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Verificar cookie admin_session
  const adminSession = req.cookies.get("admin_session");
  if (!adminSession) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
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