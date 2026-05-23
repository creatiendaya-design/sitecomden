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

const NONCE_HEADER = 'x-nonce';

// ========================================
// FUNCIONES DE SEGURIDAD
// ========================================

/**
 * Genera un nonce criptográfico (Edge-compatible) en base64.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Construye la directiva CSP usando un nonce dinámico + strict-dynamic.
 * - En producción: solo nonce + strict-dynamic. Sin 'unsafe-inline' / 'https:'
 *   para no anular strict-dynamic (browsers compatibles lo aplican; el resto
 *   queda en modo sin scripts, que es el comportamiento seguro).
 * - En desarrollo: agrega 'unsafe-eval' (Next.js HMR) y 'unsafe-inline' como
 *   fallback para navegadores que ignoran strict-dynamic.
 */
function buildCsp(nonce: string, allowSameOriginEmbed: boolean): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Fallback solo en desarrollo. En producción strict-dynamic + nonce ya
    // cubre todos los navegadores modernos; añadir 'unsafe-inline' anularía
    // strict-dynamic y abriría XSS.
    ...(isProduction ? [] : ['https:', "'unsafe-inline'", "'unsafe-eval'"]),
  ].join(' ');

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,

    // Estilos: Tailwind/shadcn requieren inline. Sin alternativa práctica.
    "style-src 'self' 'unsafe-inline'",

    // Imágenes: CDNs de productos
    "img-src 'self' data: https: blob:",

    // Fuentes: data URIs para fonts opcionales
    "font-src 'self' data:",

    // Conexiones: APIs necesarias
    "connect-src 'self' https://api.culqi.com https://*.vercel-insights.com https://*.vercel-analytics.com https://*.vercel.app https://*.clerk.accounts.dev https://*.clerk.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.tiktok.com https://connect.facebook.net https://www.facebook.com",

    // Frames: pasarelas de pago + Clerk
    "frame-src 'self' https://checkout.culqi.com https://*.clerk.accounts.dev https://*.clerk.com",

    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Plan 13: relax frame-ancestors when the request is the Customizer
    // iframe (signaled by ?theme-preview=). Anywhere else stays locked.
    `frame-ancestors ${allowSameOriginEmbed ? "'self'" : "'none'"}`,
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ];

  return directives.join('; ');
}

/**
 * Aplica Security Headers a la respuesta
 */
function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  allowSameOriginEmbed: boolean = false,
) {
  const headers = response.headers;

  // Plan 13: SAMEORIGIN when the request is for an admin Customizer iframe
  // (presence of ?theme-preview=). DENY everywhere else — clickjacking
  // protection stays intact for normal traffic.
  headers.set(
    'X-Frame-Options',
    allowSameOriginEmbed ? 'SAMEORIGIN' : 'DENY',
  );
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-XSS-Protection', '1; mode=block');

  headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()',
      'usb=()',
      'payment=(self)',
      'fullscreen=(self)',
      'clipboard-write=(self)',
    ].join(', ')
  );

  headers.set('Content-Security-Policy', buildCsp(nonce, allowSameOriginEmbed));

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

function handleAdminRoutes(req: NextRequest, requestHeaders: Headers) {
  const { pathname } = req.nextUrl;

  // Solo procesar rutas que empiezan con /admin
  if (!pathname.startsWith('/admin')) {
    return null;
  }

  // ✅ Rutas públicas de admin (login/register)
  if (pathname.startsWith('/admin-auth/')) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ✅ Redirect pages (admin/login → admin-auth/login)
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ✅ Root admin redirect (dejar que page.tsx lo maneje)
  if (pathname === '/admin') {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ✅ Verificar cookie admin_session para rutas protegidas. La validación
  // real del token (no expirado, usuario activo, etc.) ocurre server-side
  // en lib/auth.ts via getAdminSession; aquí solo gateamos la presencia
  // de la cookie para evitar viajes innecesarios a la BD.
  const adminSession = req.cookies.get('admin_session');
  if (!adminSession) {
    return NextResponse.redirect(new URL('/admin-auth/login', req.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
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

  // 🔐 Generar nonce único por request y exponerlo a Server Components
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(NONCE_HEADER, nonce);

  // Plan 13 — copy ?theme-preview=<id> into a request header so the theme
  // resolver can pick it up without prop-drilling searchParams. The
  // Customizer iframe relies on this to render the right theme. Presence
  // of the query also unlocks SAMEORIGIN frame embedding so the iframe
  // can render at all.
  //
  // Security: only honor the param when (1) an admin session cookie is
  // present and (2) the value looks like a CUID/UUID. Otherwise any visitor
  // could append ?theme-preview=anything to bypass frame-ancestors and
  // clickjack the storefront.
  const themePreviewParam = req.nextUrl.searchParams.get("theme-preview");
  const hasAdminSession = req.cookies.has("admin_session");
  const isValidThemeId = themePreviewParam
    ? /^[a-z0-9-]{20,40}$/i.test(themePreviewParam)
    : false;
  const allowSameOriginEmbed = hasAdminSession && isValidThemeId;
  if (allowSameOriginEmbed && themePreviewParam) {
    requestHeaders.set("x-theme-preview-id", themePreviewParam);
  }

  // ✅ 3. Manejar rutas admin (tu lógica original)
  const adminResult = handleAdminRoutes(req, requestHeaders);
  if (adminResult) {
    return applySecurityHeaders(adminResult, nonce, allowSameOriginEmbed);
  }

  // ✅ 4. Rutas públicas de shop (tu lógica original)
  if (isPublicRoute(req)) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return applySecurityHeaders(response, nonce, allowSameOriginEmbed);
  }

  // ✅ 5. Otras rutas (como /cuenta)
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(response, nonce, allowSameOriginEmbed);
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};