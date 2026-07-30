/**
 * Limitador de respaldo en memoria, para cuando Redis no está.
 *
 * Por qué existe (auditoría ADV-10):
 *
 * `checkRateLimit` permitía TODA petición si Upstash no estaba configurado o si
 * Redis fallaba. Eso convierte una caída de Redis —o un token mal copiado en el
 * despliegue— en la desaparición silenciosa del rate limiting de login, checkout,
 * uploads y validación de cupones. Un atacante que provoque (o simplemente
 * espere) ese fallo obtiene fuerza bruta ilimitada sobre el login del admin.
 *
 * La alternativa no es fallar cerrado: dejar el checkout y el login inaccesibles
 * cada vez que Redis tiene un hipo es un modo de fallo peor. Lo correcto es
 * **degradar**, que es lo que hace este módulo.
 *
 * ## Qué garantiza y qué no
 *
 * El estado vive en el proceso. En serverless hay N instancias, cada una con su
 * propio contador, así que el límite efectivo es N × límite. NO es equivalente a
 * Redis y no pretende serlo: el objetivo es que "sin Redis" signifique "protección
 * degradada y acotada" en vez de "sin protección". Frente a fuerza bruta la
 * diferencia entre un límite de N×5 y ninguno es la diferencia entre un ataque
 * inviable y uno trivial.
 *
 * Por eso el consumidor registra el uso del respaldo con severidad alta: es un
 * estado del que hay que salir, no un régimen de operación normal.
 */

export interface FallbackLimitResult {
  success: boolean;
  remaining: number;
  /** Epoch ms en que la ventana deja libre el hueco más antiguo. */
  reset: number;
}

/**
 * Marcas de tiempo de los aciertos vivos por clave. Se mantiene ordenada de forma
 * natural (siempre se añade `now` al final).
 */
const store = new Map<string, number[]>();

/**
 * Cota de memoria: bajo un ataque distribuido las claves son IPs distintas y el
 * mapa crecería sin freno. Al superarla se desalojan las claves menos recientes.
 */
const MAX_TRACKED_KEYS = 10_000;

/** Cada cuántas comprobaciones se barren las claves ya expiradas. */
const SWEEP_EVERY_CHECKS = 500;

let checksSinceSweep = 0;

/** Elimina claves cuyo acierto más reciente ya salió de cualquier ventana viva. */
function sweepExpired(now: number, maxWindowMs: number): void {
  const cutoff = now - maxWindowMs;
  for (const [key, hits] of store) {
    if (hits.length === 0 || hits[hits.length - 1] <= cutoff) {
      store.delete(key);
    }
  }
}

/** Desaloja el 10% de claves con actividad más antigua. */
function evictLeastRecent(): void {
  const entries = [...store.entries()].sort(
    (a, b) => a[1][a[1].length - 1] - b[1][b[1].length - 1],
  );
  const toDrop = Math.max(1, Math.floor(entries.length * 0.1));
  for (let i = 0; i < toDrop; i++) {
    store.delete(entries[i][0]);
  }
}

/**
 * Ventana deslizante en memoria. Cuenta TODA petición (igual que la de Upstash),
 * de modo que insistir durante el bloqueo mantiene la ventana ocupada.
 */
export function checkFallbackLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): FallbackLimitResult {
  if (++checksSinceSweep >= SWEEP_EVERY_CHECKS) {
    checksSinceSweep = 0;
    // La ventana más larga en uso es de una hora; barrer con ese margen no borra
    // por error contadores que aún cuentan.
    sweepExpired(now, Math.max(windowMs, 60 * 60 * 1000));
  }

  const cutoff = now - windowMs;
  const previous = store.get(key);
  const hits = previous ? previous.filter((at) => at > cutoff) : [];

  if (hits.length >= limit) {
    // Ya bloqueado: no se añade la marca. Sin este tope el array crecería con
    // cada petición de un atacante que insiste.
    store.set(key, hits);
    return { success: false, remaining: 0, reset: hits[0] + windowMs };
  }

  hits.push(now);
  store.set(key, hits);

  if (store.size > MAX_TRACKED_KEYS) {
    evictLeastRecent();
  }

  return {
    success: true,
    remaining: limit - hits.length,
    reset: hits[0] + windowMs,
  };
}

/** Sólo para pruebas: deja el respaldo en estado limpio. */
export function __resetFallbackStore(): void {
  store.clear();
  checksSinceSweep = 0;
}

/** Sólo para pruebas/diagnóstico: cuántas claves se están siguiendo. */
export function __fallbackStoreSize(): number {
  return store.size;
}
