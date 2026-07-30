/**
 * Tests de la ventana deslizante en memoria (auditoría ADV-10).
 *
 * Lo que importa: que sin Redis el sistema siga NEGANDO peticiones al pasar el
 * límite. Antes las permitía todas, así que una caída de Redis —o un token mal
 * puesto en el despliegue— eliminaba la protección de fuerza bruta del login.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  checkFallbackLimit,
  __resetFallbackStore,
  __fallbackStoreSize,
} from "./rate-limit-fallback";

const WINDOW = 60_000;
const T0 = 1_800_000_000_000;

beforeEach(() => {
  __resetFallbackStore();
});

describe("checkFallbackLimit", () => {
  it("permite exactamente hasta el límite", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkFallbackLimit("ip:1", 3, WINDOW, T0 + i).success).toBe(true);
    }
  });

  it("niega al superar el límite (el fallo que arregla ADV-10)", () => {
    for (let i = 0; i < 3; i++) checkFallbackLimit("ip:1", 3, WINDOW, T0 + i);

    const result = checkFallbackLimit("ip:1", 3, WINDOW, T0 + 4);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("descuenta el restante en cada acierto", () => {
    expect(checkFallbackLimit("ip:1", 3, WINDOW, T0).remaining).toBe(2);
    expect(checkFallbackLimit("ip:1", 3, WINDOW, T0 + 1).remaining).toBe(1);
    expect(checkFallbackLimit("ip:1", 3, WINDOW, T0 + 2).remaining).toBe(0);
  });

  it("libera el hueco cuando la ventana avanza", () => {
    for (let i = 0; i < 3; i++) checkFallbackLimit("ip:1", 3, WINDOW, T0 + i);
    expect(checkFallbackLimit("ip:1", 3, WINDOW, T0 + 10).success).toBe(false);

    // Justo después de que expire el acierto más antiguo.
    const later = T0 + WINDOW + 1;
    expect(checkFallbackLimit("ip:1", 3, WINDOW, later).success).toBe(true);
  });

  it("informa cuándo se libera el hueco más antiguo", () => {
    const first = checkFallbackLimit("ip:1", 2, WINDOW, T0);
    expect(first.reset).toBe(T0 + WINDOW);

    checkFallbackLimit("ip:1", 2, WINDOW, T0 + 500);
    const blocked = checkFallbackLimit("ip:1", 2, WINDOW, T0 + 600);
    expect(blocked.reset).toBe(T0 + WINDOW);
  });

  it("aísla claves distintas", () => {
    for (let i = 0; i < 3; i++) checkFallbackLimit("ip:1", 3, WINDOW, T0 + i);

    expect(checkFallbackLimit("ip:2", 3, WINDOW, T0 + 4).success).toBe(true);
    expect(checkFallbackLimit("ip:1", 3, WINDOW, T0 + 5).success).toBe(false);
  });

  // Sin el tope, un atacante que insiste haría crecer el array indefinidamente.
  it("no acumula memoria por peticiones ya bloqueadas", () => {
    for (let i = 0; i < 3; i++) checkFallbackLimit("ip:1", 3, WINDOW, T0 + i);
    for (let i = 0; i < 1000; i++) checkFallbackLimit("ip:1", 3, WINDOW, T0 + 10 + i);

    // El bloqueo se mantiene y la ventana no se extiende más allá del primer
    // acierto real: en cuanto expira, vuelve a permitir.
    expect(checkFallbackLimit("ip:1", 3, WINDOW, T0 + 20).success).toBe(false);
    expect(checkFallbackLimit("ip:1", 3, WINDOW, T0 + WINDOW + 1).success).toBe(true);
  });

  it("acota el número de claves seguidas bajo un ataque distribuido", () => {
    for (let i = 0; i < 11_000; i++) {
      checkFallbackLimit(`ip:${i}`, 5, WINDOW, T0 + i);
    }

    expect(__fallbackStoreSize()).toBeLessThanOrEqual(10_000);
  });

  it("con límite 1 niega el segundo intento inmediato", () => {
    expect(checkFallbackLimit("ip:1", 1, WINDOW, T0).success).toBe(true);
    expect(checkFallbackLimit("ip:1", 1, WINDOW, T0).success).toBe(false);
  });
});
