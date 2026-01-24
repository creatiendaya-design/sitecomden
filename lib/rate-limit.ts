/**
 * 🚦 SISTEMA DE RATE LIMITING
 * 
 * Este archivo implementa rate limiting usando Upstash Redis para:
 * - Prevenir brute force en login
 * - Prevenir spam en formularios
 * - Limitar requests a APIs
 * - Prevenir DoS
 * 
 * IMPORTANTE: Requiere configurar variables de entorno:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * 
 * Obtener en: https://upstash.com/
 */

import { Ratelimit } from "@upstash/ratelimit";
import type { Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ===================================================================
// CONFIGURACIÓN DE REDIS
// ===================================================================

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ===================================================================
// RATE LIMITERS PREDEFINIDOS
// ===================================================================

/**
 * 🔐 LOGIN: 5 intentos por 15 minutos
 * Previene brute force de contraseñas
 */
export const loginRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "ratelimit:login",
});

/**
 * 📝 FORMS: 3 envíos por hora
 * Para formularios de contacto, reclamos, newsletter
 */
export const formRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "ratelimit:forms",
});

/**
 * 🔄 API GENERAL: 100 requests por minuto
 * Para endpoints API públicos
 */
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "ratelimit:api",
});

/**
 * 🛒 CHECKOUT: 10 intentos por 10 minutos
 * Para prevenir spam de órdenes falsas
 */
export const checkoutRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  analytics: true,
  prefix: "ratelimit:checkout",
});

/**
 * 📤 UPLOAD: 20 uploads por hora
 * Para subida de archivos
 */
export const uploadRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  analytics: true,
  prefix: "ratelimit:upload",
});

/**
 * 🔍 SEARCH: 50 búsquedas por minuto
 * Para buscador de productos
 */
export const searchRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 m"),
  analytics: true,
  prefix: "ratelimit:search",
});

/**
 * 🎟️ COUPON VALIDATION: 10 intentos por minuto
 * Para validar cupones (previene bruteforce de códigos)
 */
export const couponRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "ratelimit:coupon",
});

// ===================================================================
// HELPERS
// ===================================================================

/**
 * Obtiene la IP del cliente desde los headers
 * Prioriza: X-Forwarded-For > X-Real-IP > fallback
 */
export function getClientIp(request: Request): string {
  // Vercel/Next.js pone la IP real en x-forwarded-for
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Puede ser lista de IPs, tomar la primera
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback (no debería llegar aquí en producción)
  return "unknown";
}

/**
 * Crea un identificador único para rate limiting
 * Combina IP + userAgent para evitar bypass cambiando IP
 */
export function getClientIdentifier(request: Request): string {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  
  // Hash simple del user agent para acortarlo
  const uaHash = hashString(userAgent).substring(0, 8);
  
  return `${ip}:${uaHash}`;
}

/**
 * Hash simple de string (no criptográfico, solo para acortar)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Crea un rate limiter personalizado
 * 
 * @example
 * const customLimiter = createRateLimiter({
 *   limit: 10,
 *   window: "5 m",
 *   prefix: "custom",
 * });
 */
export function createRateLimiter(options: {
  limit: number;
  window: Duration;
  prefix: string;
}) {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, options.window),
    analytics: true,
    prefix: `ratelimit:${options.prefix}`,
  });
}

// ===================================================================
// WRAPPER PARA LOGGING
// ===================================================================

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

/**
 * Wrapper que hace rate limiting + logging si se excede
 * 
 * @example
 * const result = await checkRateLimit(loginRateLimiter, ip, {
 *   action: "login",
 *   userId: email,
 * });
 * 
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: "Demasiados intentos" },
 *     { status: 429 }
 *   );
 * }
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
  context?: {
    action?: string;
    userId?: string;
    details?: Record<string, any>;
  }
): Promise<RateLimitResult> {
  const result = await limiter.limit(identifier);

  // Si se excedió el límite, loguear
  if (!result.success && context) {
    console.warn("🚫 Rate limit exceeded:", {
      identifier,
      action: context.action || "unknown",
      userId: context.userId,
      remaining: result.remaining,
      reset: new Date(result.reset),
      ...context.details,
    });

    // TODO: Agregar a base de datos para análisis
    // await logSecurityEvent({
    //   type: "rate_limit_exceeded",
    //   ip: identifier,
    //   details: context,
    // });
  }

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: result.limit,
  };
}

// ===================================================================
// MIDDLEWARE HELPER
// ===================================================================

/**
 * Helper para usar rate limiting en API routes con respuesta automática
 * 
 * @example
 * export async function POST(request: Request) {
 *   const rateLimitResponse = await withRateLimit(
 *     request,
 *     loginRateLimiter,
 *     { action: "login" }
 *   );
 *   if (rateLimitResponse) return rateLimitResponse;
 *   
 *   // Continuar con la lógica...
 * }
 */
export async function withRateLimit(
  request: Request,
  limiter: Ratelimit,
  context?: {
    action?: string;
    userId?: string;
    customIdentifier?: string;
    errorMessage?: string;
  }
): Promise<Response | null> {
  const identifier = context?.customIdentifier || getClientIp(request);

  const result = await checkRateLimit(limiter, identifier, context);

  if (!result.success) {
    const resetDate = new Date(result.reset);
    const resetIn = Math.ceil((result.reset - Date.now()) / 1000 / 60); // minutos

    return Response.json(
      {
        error: context?.errorMessage || "Demasiadas peticiones. Intenta más tarde",
        code: "RATE_LIMIT_EXCEEDED",
        remaining: result.remaining,
        reset_at: resetDate.toISOString(),
        reset_in_minutes: resetIn,
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
        },
      }
    );
  }

  return null;
}

// ===================================================================
// RESET MANUAL (Para testing o casos especiales)
// ===================================================================

/**
 * Resetear rate limit para un identifier específico
 * Solo usar en casos especiales (ej: usuario bloqueado por error)
 * 
 * @example
 * await resetRateLimit("login", "192.168.1.1");
 */
export async function resetRateLimit(
  prefix: string,
  identifier: string
): Promise<void> {
  const key = `ratelimit:${prefix}:${identifier}`;
  await redis.del(key);
  console.log(`🔄 Rate limit reset para: ${key}`);
}

// ===================================================================
// EJEMPLOS DE USO
// ===================================================================

/*
// ========================================
// EJEMPLO 1: Login con rate limiting
// ========================================
// app/api/admin/login/route.ts

import { withRateLimit, loginRateLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // ✅ Rate limiting automático
  const rateLimitResponse = await withRateLimit(request, loginRateLimiter, {
    action: "login",
    errorMessage: "Demasiados intentos de login. Intenta en 15 minutos",
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Continuar con login...
  const { email, password } = await request.json();
  // ...
}


// ========================================
// EJEMPLO 2: Formulario de contacto
// ========================================
// app/api/complaints/submit/route.ts

import { checkRateLimit, formRateLimiter, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // ✅ Rate limiting manual con logging
  const result = await checkRateLimit(formRateLimiter, ip, {
    action: "submit_complaint",
    details: { timestamp: new Date() },
  });

  if (!result.success) {
    return NextResponse.json(
      { 
        error: `Demasiados reclamos. Puedes enviar ${result.limit} por hora.`,
        retry_in_minutes: Math.ceil((result.reset - Date.now()) / 1000 / 60)
      },
      { status: 429 }
    );
  }

  // Continuar con envío...
}


// ========================================
// EJEMPLO 3: Upload con rate limiting
// ========================================
// app/api/upload/route.ts

import { uploadRateLimiter, getClientIdentifier } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const identifier = getClientIdentifier(request);

  const { success, remaining } = await uploadRateLimiter.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: "Demasiados uploads. Límite: 20 por hora" },
      { status: 429 }
    );
  }

  console.log(`📤 Upload permitido. Restantes: ${remaining}/20`);

  // Continuar con upload...
}


// ========================================
// EJEMPLO 4: Rate limiter personalizado
// ========================================

import { createRateLimiter } from "@/lib/rate-limit";

const emailRateLimiter = createRateLimiter({
  limit: 5,
  window: "1 h",
  prefix: "email",
});

export async function POST(request: Request) {
  const { email } = await request.json();

  // Limitar por email en lugar de IP
  const { success } = await emailRateLimiter.limit(email);

  if (!success) {
    return NextResponse.json(
      { error: "Has enviado demasiados emails" },
      { status: 429 }
    );
  }

  // Enviar email...
}
*/