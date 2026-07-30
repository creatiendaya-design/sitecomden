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
import { logger } from "@/lib/logger";
import { checkFallbackLimit } from "@/lib/rate-limit-fallback";

const log = logger.child({ module: "rate-limit" });

// ===================================================================
// CONFIGURACIÓN DE REDIS
// ===================================================================

const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!hasUpstashConfig) {
  // En producción esto NO es una nota de desarrollo: significa que login,
  // checkout y uploads corren con el respaldo en memoria, cuyo límite efectivo se
  // multiplica por el número de instancias. Debe verse en las alertas.
  if (process.env.NODE_ENV === "production") {
    log.error(
      "UPSTASH_REDIS env vars not set — rate limiting DEGRADED to per-instance in-memory limits",
    );
  } else {
    log.warn("UPSTASH_REDIS env vars not set — using in-memory rate limiting (dev)");
  }
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ===================================================================
// REGISTRO DE LIMITADORES (para el respaldo en memoria)
// ===================================================================

/**
 * Nivel de riesgo de lo que protege un limitador.
 *
 * `critical` cubre lo que un atacante ataca directamente —credenciales, dinero,
 * códigos adivinables—. Cuando uno de estos cae al respaldo se registra como
 * error, porque la protección quedó debilitada y hay que restaurar Redis.
 * `standard` cubre abuso y coste (spam, uploads, búsquedas): degradar ahí es
 * molesto, no peligroso.
 */
export type RateLimitTier = "critical" | "standard";

interface LimiterSpec {
  limit: number;
  windowMs: number;
  prefix: string;
  tier: RateLimitTier;
}

/**
 * `Ratelimit` no expone su propia configuración, y el respaldo necesita el límite
 * y la ventana. Se registran aquí al construirlo para que `checkRateLimit` siga
 * recibiendo sólo el limitador y ningún llamador tenga que cambiar.
 */
const LIMITER_SPECS = new WeakMap<Ratelimit, LimiterSpec>();

/** Convierte una `Duration` de Upstash ("15 m", "1 h") a milisegundos. */
export function parseDurationMs(window: Duration): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(window.trim());
  if (!match) {
    throw new Error(`Ventana de rate limit no reconocida: "${window}"`);
  }

  const value = Number(match[1]);
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return value * unitMs[match[2]];
}

function defineRateLimiter(options: {
  limit: number;
  window: Duration;
  prefix: string;
  tier: RateLimitTier;
}): Ratelimit {
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(options.limit, options.window),
    analytics: true,
    prefix: `ratelimit:${options.prefix}`,
  });

  LIMITER_SPECS.set(limiter, {
    limit: options.limit,
    windowMs: parseDurationMs(options.window),
    prefix: options.prefix,
    tier: options.tier,
  });

  return limiter;
}

/**
 * Límite por defecto para un limitador sin registrar. No debería ocurrir —todos
 * los constructores registran— pero si ocurre, se aplica algo restrictivo en vez
 * de dejar pasar todo, que es el fallo que arregla ADV-10.
 */
const UNREGISTERED_FALLBACK: LimiterSpec = {
  limit: 10,
  windowMs: 60_000,
  prefix: "unregistered",
  tier: "critical",
};

// ===================================================================
// RATE LIMITERS PREDEFINIDOS
// ===================================================================

/**
 * 🔐 LOGIN: 5 intentos por 15 minutos
 * Previene brute force de contraseñas
 */
export const loginRateLimiter = defineRateLimiter({
  limit: 5,
  window: "15 m",
  prefix: "login",
  tier: "critical",
});

/**
 * 📝 FORMS: 3 envíos por hora
 * Para formularios de contacto, reclamos, newsletter
 */
export const formRateLimiter = defineRateLimiter({
  limit: 3,
  window: "1 h",
  prefix: "forms",
  tier: "standard",
});

/**
 * 🔄 API GENERAL: 100 requests por minuto
 * Para endpoints API públicos
 */
export const apiRateLimiter = defineRateLimiter({
  limit: 100,
  window: "1 m",
  prefix: "api",
  tier: "standard",
});

/**
 * 🛒 CHECKOUT: 10 intentos por 10 minutos
 * Para prevenir spam de órdenes falsas
 */
export const checkoutRateLimiter = defineRateLimiter({
  limit: 10,
  window: "10 m",
  prefix: "checkout",
  // `critical`: crea órdenes, reserva inventario y abre sesiones de cobro.
  tier: "critical",
});

/**
 * 📤 UPLOAD: 20 uploads por hora
 * Para subida de archivos
 */
export const uploadRateLimiter = defineRateLimiter({
  limit: 20,
  window: "1 h",
  prefix: "upload",
  tier: "standard",
});

/**
 * 🔍 SEARCH: 50 búsquedas por minuto
 * Para buscador de productos
 */
export const searchRateLimiter = defineRateLimiter({
  limit: 50,
  window: "1 m",
  prefix: "search",
  tier: "standard",
});

/**
 * 🎟️ COUPON VALIDATION: 10 intentos por minuto
 * Para validar cupones (previene bruteforce de códigos)
 */
export const couponRateLimiter = defineRateLimiter({
  limit: 10,
  window: "1 m",
  prefix: "coupon",
  // `critical`: un cupón es un código adivinable con valor monetario.
  tier: "critical",
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
  /** Por defecto `critical`: ante la duda, degradar protegiendo. */
  tier?: RateLimitTier;
}) {
  return defineRateLimiter({
    limit: options.limit,
    window: options.window,
    prefix: options.prefix,
    tier: options.tier ?? "critical",
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
  /**
   * `true` cuando la decisión la tomó el contador en memoria porque Redis no
   * estaba disponible. Los llamadores no necesitan mirarlo (la semántica de
   * `success` no cambia); existe para pruebas y diagnóstico.
   */
  degraded?: boolean;
}

/**
 * Resuelve el límite con el contador en memoria del proceso.
 *
 * Se registra en cada uso, y con severidad según el nivel de riesgo: un login sin
 * Redis es un incidente de seguridad que hay que atender, una búsqueda sin Redis
 * es una molestia.
 */
function applyFallback(
  limiter: Ratelimit,
  identifier: string,
  cause: "not-configured" | "redis-unreachable",
  context?: { action?: string; userId?: string },
  err?: unknown,
): RateLimitResult {
  const spec = LIMITER_SPECS.get(limiter) ?? UNREGISTERED_FALLBACK;

  if (spec === UNREGISTERED_FALLBACK) {
    log.error(
      { action: context?.action },
      "Rate limiter used without a registered spec — applying restrictive default",
    );
  }

  const outcome = checkFallbackLimit(
    `${spec.prefix}:${identifier}`,
    spec.limit,
    spec.windowMs,
  );

  const detail = {
    cause,
    prefix: spec.prefix,
    tier: spec.tier,
    action: context?.action,
    allowed: outcome.success,
    ...(err ? { err: err instanceof Error ? err.message : err } : {}),
  };

  if (spec.tier === "critical") {
    log.error(
      detail,
      "Rate limiting DEGRADED to in-memory for a critical limiter — restore Redis",
    );
  } else {
    log.warn(detail, "Rate limiting degraded to in-memory");
  }

  return {
    success: outcome.success,
    remaining: outcome.remaining,
    reset: outcome.reset,
    limit: spec.limit,
    degraded: true,
  };
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
    details?: Record<string, unknown>;
  }
): Promise<RateLimitResult> {
  // Sin Redis NO se deja pasar todo (ADV-10): se degrada al contador en memoria
  // del proceso. Protección más débil que Redis, pero acotada.
  if (!hasUpstashConfig) {
    return applyFallback(limiter, identifier, "not-configured", context);
  }

  let result: Awaited<ReturnType<typeof limiter.limit>>;
  try {
    result = await limiter.limit(identifier);
  } catch (err) {
    return applyFallback(limiter, identifier, "redis-unreachable", context, err);
  }

  // Si se excedió el límite, loguear
  if (!result.success && context) {
    log.warn(
      {
        identifier,
        action: context.action || "unknown",
        userId: context.userId,
        remaining: result.remaining,
        reset: new Date(result.reset).toISOString(),
        ...context.details,
      },
      "Rate limit exceeded",
    );

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
  log.info({ key }, "Rate limit reset");
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

  log.debug({ remaining, limit: 20 }, "Upload allowed");

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