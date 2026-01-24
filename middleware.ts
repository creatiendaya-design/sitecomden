/**
 * 🛡️ MIDDLEWARE - Autenticación + Seguridad
 * 
 * Este middleware combina:
 * 1. Sistema dual de autenticación (Clerk para shop + Cookies para admin)
 * 2. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 3. Detección de peticiones sospechosas
 * 4. Protección de archivos sensibles
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ========================================
// CONFIGURACIÓN
// ========================================

const isProduction = process.env.NODE_ENV === 'production';

// ========================================
// FUNCIONES DE SEGURIDAD
// ========================================

/**
 * Aplica Security Headers a la respuesta
 */
function applySecurityHeaders(response: NextResponse) {
  const headers = response.headers;

  // 🔒 Prevenir clickjacking (iframe embedding)
  headers.set('X-Frame-Options', 'DENY');

  // 🔒 Prevenir MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // 🔒 Referrer policy (no enviar referrer a otros sitios)
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 🔒 XSS Protection (legacy, pero no hace daño)
  headers.set('X-XSS-Protection', '1; mode=block');

  // 🔒 Permissions Policy (limitar features del browser)
  headers.set(
    'Permissions-Policy',
    [
      'camera=()',           // No camera
      'microphone=()',       // No microphone
      'geolocation=(self)',  // Geolocation solo en mismo origen
      'interest-cohort=()',  // No FLoC tracking
    ].join(', ')
  );

  // 🔒 Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    
    // Scripts: permitir inline + eval (Next.js) + Culqi + Vercel + Clerk
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.culqi.com https://*.vercel-insights.com https://*.vercel-analytics.com https://*.clerk.accounts.dev https://*.clerk.com",
    
    // Estilos: permitir inline (Tailwind/shadcn)
    "style-src 'self' 'unsafe-inline'",
    
    // Imágenes: cualquier origen (productos de CDN)
    "img-src 'self' data: https: blob:",
    
    // Fuentes: permitir data URIs
    "font-src 'self' data:",
    
    // Conexiones: APIs necesarias
    "connect-src 'self' https://api.culqi.com https://*.vercel-insights.com https://*.vercel-analytics.com https://*.vercel.app https://*.clerk.accounts.dev https://*.clerk.com",
    
    // Frames: Culqi + Clerk
    "frame-src 'self' https://checkout.culqi.com https://*.clerk.accounts.dev https://*.clerk.com",
    
    // Media: solo mismo origen
    "media-src 'self'",
    
    // Object/embed: bloquear
    "object-src 'none'",
    
    // Base URI: solo mismo origen
    "base-uri 'self'",
    
    // Form action: solo mismo origen
    "form-action 'self'",
    
    // Frame ancestors: ninguno (previene embedding)
    "frame-ancestors 'none'",
    
    // Upgrade insecure requests en producción
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ];

  headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // 🔒 HSTS (HTTPS only) - SOLO EN PRODUCCIÓN
  if (isProduction) {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

/**
 * Detecta si la petición es sospechosa
 */
function isSuspiciousRequest(req: NextRequest): boolean {
  const { pathname, searchParams } = req.nextUrl;
  const userAgent = req.headers.get('user-agent') || '';

  // 🚨 Patrones sospechosos en URL
  const suspiciousPatterns = [
    /\.\./,                  // Path traversal (..)
    /<script/i,              // XSS attempt
    /javascript:/i,          // XSS attempt
    /eval\(/i,               // Eval injection
    /union.*select/i,        // SQL injection
    /insert.*into/i,         // SQL injection
    /drop.*table/i,          // SQL injection
    /exec\(/i,               // Command injection
    /\/etc\/passwd/,         // File access attempt
    /\.\.\/\.\.\//,          // Directory traversal
    /%00/,                   // Null byte injection
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(pathname))) {
    return true;
  }

  // 🚨 Verificar parámetros de query
  for (const [, value] of searchParams.entries()) {
    if (suspiciousPatterns.some(pattern => pattern.test(value))) {
      return true;
    }
  }

  // 🚨 User agents sospechosos (bots maliciosos)
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /masscan/i,
    /nmap/i,
    /metasploit/i,
  ];

  if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    return true;
  }

  return false;
}

/**
 * Verifica si se está intentando acceder a archivos protegidos
 */
function isAccessingProtectedFile(pathname: string): boolean {
  const protectedPatterns = [
    /\.env/,           // Archivos .env
    /\.git/,           // Carpeta .git
    /\.vscode/,        // Configuración VSCode
    /package\.json/,   // package.json
    /prisma/,          // Carpeta prisma
    /\.sql$/,          // Archivos SQL
    /\.bak$/,          // Backups
    /\.log$/,          // Logs
  ];

  return protectedPatterns.some(pattern => pattern.test(pathname));
}

/**
 * Obtiene la IP del cliente
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ========================================
// LÓGICA DE ADMIN (Tu código original)
// ========================================

function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Solo procesar rutas que empiezan con /admin
  if (!pathname.startsWith('/admin')) {
    return null;
  }

  // ✅ Rutas públicas de admin (login/register)
  if (pathname.startsWith('/admin-auth/')) {
    return NextResponse.next();
  }

  // ✅ Redirect pages (admin/login → admin-auth/login)
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return NextResponse.next();
  }

  // ✅ Root admin redirect (dejar que page.tsx lo maneje)
  if (pathname === '/admin') {
    return NextResponse.next();
  }

  // ✅ Verificar cookie admin_session para rutas protegidas
  const adminSession = req.cookies.get('admin_session');
  if (!adminSession) {
    return NextResponse.redirect(new URL('/admin-auth/login', req.url));
  }

  // ⭐ Agregar userId al header para verificación de permisos
  const response = NextResponse.next();
  response.headers.set('x-user-id', adminSession.value);
  return response;
}

// ========================================
// LÓGICA DE SHOP (Clerk) - Tu código original
// ========================================

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
  '/libro-reclamaciones(.*)',
  '/orden(.*)',
]);

// ========================================
// MIDDLEWARE PRINCIPAL (Mejorado)
// ========================================

export default clerkMiddleware((auth, req) => {
  // ✅ 1. Detectar y bloquear peticiones sospechosas
  if (isSuspiciousRequest(req)) {
    console.warn('🚨 Petición sospechosa detectada:', {
      ip: getClientIp(req),
      path: req.nextUrl.pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent'),
    });

    // TODO: Agregar a SecurityLog en base de datos
    
    return NextResponse.json(
      { error: 'Request blocked' },
      { status: 403 }
    );
  }

  // ✅ 2. Bloquear acceso a archivos sensibles
  if (isAccessingProtectedFile(req.nextUrl.pathname)) {
    console.warn('🚨 Intento de acceso a archivo protegido:', {
      ip: getClientIp(req),
      path: req.nextUrl.pathname,
    });

    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // ✅ 3. Manejar rutas admin (tu lógica original)
  const adminResult = handleAdminRoutes(req);
  if (adminResult) {
    // Aplicar security headers a la respuesta
    return applySecurityHeaders(adminResult);
  }

  // ✅ 4. Rutas públicas de shop (tu lógica original)
  if (isPublicRoute(req)) {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }

  // ✅ 5. Otras rutas (como /cuenta)
  const response = NextResponse.next();
  return applySecurityHeaders(response);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};