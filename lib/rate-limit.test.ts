/**
 * Tests de la degradación del rate limiting (auditoría ADV-10).
 *
 * El hallazgo: `checkRateLimit` devolvía `success: true` a TODA petición cuando
 * Upstash no estaba configurado o cuando Redis fallaba. Es decir, una caída de
 * Redis —o un token mal copiado en el despliegue— eliminaba en silencio la
 * protección de fuerza bruta del login del admin, del checkout y de la validación
 * de cupones.
 *
 * Aquí se comprueba que en ambos escenarios se sigue negando al pasar el límite,
 * y que el incidente se registra con la severidad que corresponde al riesgo.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  loggerChild: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    del = vi.fn();
  },
}));

vi.mock("@upstash/ratelimit", () => {
  class FakeRatelimit {
    limit = mocks.limit;
    static slidingWindow = (limit: number, window: string) => ({ limit, window });
  }
  return { Ratelimit: FakeRatelimit };
});

vi.mock("@/lib/logger", () => ({ logger: { child: () => mocks.loggerChild } }));

/**
 * `hasUpstashConfig` se resuelve al cargar el módulo, así que cada escenario
 * necesita importarlo de nuevo con el entorno ya puesto.
 */
async function loadWithUpstash(configured: boolean) {
  vi.resetModules();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", configured ? "https://redis.test" : "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", configured ? "token" : "");
  const { __resetFallbackStore } = await import("./rate-limit-fallback");
  __resetFallbackStore();
  return import("./rate-limit");
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseDurationMs", () => {
  it("convierte las unidades de Upstash", async () => {
    const { parseDurationMs } = await loadWithUpstash(true);

    expect(parseDurationMs("500 ms")).toBe(500);
    expect(parseDurationMs("30 s")).toBe(30_000);
    expect(parseDurationMs("15 m")).toBe(900_000);
    expect(parseDurationMs("1 h")).toBe(3_600_000);
    expect(parseDurationMs("1 d")).toBe(86_400_000);
  });

  it("falla ruidosamente ante una ventana no reconocida", async () => {
    const { parseDurationMs } = await loadWithUpstash(true);

    // @ts-expect-error entrada inválida a propósito
    expect(() => parseDurationMs("un rato")).toThrow(/no reconocida/);
  });
});

describe("sin Upstash configurado", () => {
  it("NO deja pasar todo: niega al superar el límite de login", async () => {
    const { checkRateLimit, loginRateLimiter } = await loadWithUpstash(false);

    // loginRateLimiter: 5 por 15 minutos.
    for (let i = 0; i < 5; i++) {
      const ok = await checkRateLimit(loginRateLimiter, "1.2.3.4", { action: "login" });
      expect(ok.success).toBe(true);
    }

    const blocked = await checkRateLimit(loginRateLimiter, "1.2.3.4", { action: "login" });

    expect(blocked.success).toBe(false);
    expect(blocked.degraded).toBe(true);
    // Nunca se intentó hablar con Redis.
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it("informa el límite real del limitador, no 0", async () => {
    const { checkRateLimit, loginRateLimiter } = await loadWithUpstash(false);

    const result = await checkRateLimit(loginRateLimiter, "5.6.7.8");

    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(4);
  });

  it("mantiene independientes los limitadores por prefijo", async () => {
    const { checkRateLimit, loginRateLimiter, searchRateLimiter } =
      await loadWithUpstash(false);

    for (let i = 0; i < 5; i++) await checkRateLimit(loginRateLimiter, "1.2.3.4");

    expect((await checkRateLimit(loginRateLimiter, "1.2.3.4")).success).toBe(false);
    // Misma IP, otro limitador: no debe arrastrar el bloqueo.
    expect((await checkRateLimit(searchRateLimiter, "1.2.3.4")).success).toBe(true);
  });
});

describe("Redis inalcanzable", () => {
  it("degrada al contador en memoria en vez de permitir todo", async () => {
    const { checkRateLimit, couponRateLimiter } = await loadWithUpstash(true);
    mocks.limit.mockRejectedValue(new Error("ECONNREFUSED"));

    // couponRateLimiter: 10 por minuto.
    for (let i = 0; i < 10; i++) {
      expect((await checkRateLimit(couponRateLimiter, "9.9.9.9")).success).toBe(true);
    }

    const blocked = await checkRateLimit(couponRateLimiter, "9.9.9.9");

    expect(blocked.success).toBe(false);
    expect(blocked.degraded).toBe(true);
  });

  it("usa Redis cuando responde, sin marcar degradado", async () => {
    const { checkRateLimit, searchRateLimiter } = await loadWithUpstash(true);
    mocks.limit.mockResolvedValue({
      success: true,
      remaining: 49,
      reset: 123,
      limit: 50,
    });

    const result = await checkRateLimit(searchRateLimiter, "1.1.1.1");

    expect(result).toMatchObject({ success: true, remaining: 49, limit: 50 });
    expect(result.degraded).toBeUndefined();
  });

  it("respeta el bloqueo que viene de Redis", async () => {
    const { checkRateLimit, loginRateLimiter } = await loadWithUpstash(true);
    mocks.limit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 456,
      limit: 5,
    });

    const result = await checkRateLimit(loginRateLimiter, "1.1.1.1", { action: "login" });

    expect(result.success).toBe(false);
  });
});

describe("severidad del registro al degradar", () => {
  it("un limitador crítico se registra como error", async () => {
    const { checkRateLimit, loginRateLimiter } = await loadWithUpstash(false);

    await checkRateLimit(loginRateLimiter, "1.2.3.4", { action: "login" });

    expect(mocks.loggerChild.error).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "critical", prefix: "login" }),
      expect.stringContaining("DEGRADED"),
    );
  });

  it("un limitador estándar se registra como advertencia", async () => {
    const { checkRateLimit, searchRateLimiter } = await loadWithUpstash(false);

    await checkRateLimit(searchRateLimiter, "1.2.3.4", { action: "search" });

    expect(mocks.loggerChild.warn).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "standard", prefix: "search" }),
      expect.any(String),
    );
    expect(mocks.loggerChild.error).not.toHaveBeenCalled();
  });
});

describe("createRateLimiter", () => {
  it("registra el limitador para que también degrade y no pase todo", async () => {
    const { createRateLimiter, checkRateLimit } = await loadWithUpstash(false);
    const custom = createRateLimiter({ limit: 2, window: "1 m", prefix: "custom" });

    expect((await checkRateLimit(custom, "ip")).success).toBe(true);
    expect((await checkRateLimit(custom, "ip")).success).toBe(true);
    expect((await checkRateLimit(custom, "ip")).success).toBe(false);
  });

  it("trata como crítico un limitador sin nivel declarado", async () => {
    const { createRateLimiter, checkRateLimit } = await loadWithUpstash(false);
    const custom = createRateLimiter({ limit: 1, window: "1 m", prefix: "custom2" });

    await checkRateLimit(custom, "ip");

    expect(mocks.loggerChild.error).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "critical" }),
      expect.any(String),
    );
  });
});
