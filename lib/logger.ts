/**
 * 🪵 Pino-based structured logger.
 *
 * Why pino instead of console:
 * - JSON output in production → Vercel logs parses fields out-of-the-box,
 *   you can grep `requestId:abc123` across cold/warm invocations.
 * - Levels (debug/info/warn/error) → filter noise without code changes.
 * - `redact` strips secrets (password, authorization headers, tokens) so a
 *   stray log({user}) can't leak credentials.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info({ orderId }, "Order created");
 *
 * Per-request:
 *   import { getRequestLogger } from "@/lib/logger";
 *   const log = await getRequestLogger();   // auto-attaches requestId
 *   log.info({ paymentId }, "Payment approved");
 *
 * IMPORTANT: do not call this from Edge runtime code (e.g. middleware,
 * edge route handlers). Pino targets Node. The middleware only generates
 * the requestId — it does not log via pino.
 */

import { headers } from "next/headers";
import pino, { type Logger } from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  // Pretty colors in dev, raw JSON in prod (Vercel parses JSON natively).
  // `transport` requires worker_threads which is fine in Node runtime but
  // blows up under Edge — that's why this module is Node-only.
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    },
  }),
  // Strip well-known secret-bearing fields. Patterns use pino's path syntax
  // (dot-prefixed, `*` wildcard for any key at that depth).
  redact: {
    paths: [
      "password",
      "*.password",
      "newPassword",
      "*.newPassword",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "apiKey",
      "*.apiKey",
      "creditCard",
      "*.creditCard",
    ],
    censor: "[REDACTED]",
  },
  base: {
    app: "shopgood",
    env: process.env.NODE_ENV ?? "development",
  },
});

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Returns a child logger bound to the current request's `x-request-id`
 * header (set by middleware). Falls back to the bare logger outside a
 * request scope (background jobs, scripts).
 */
export async function getRequestLogger(): Promise<Logger> {
  try {
    const h = await headers();
    const requestId = h.get(REQUEST_ID_HEADER);
    return requestId ? logger.child({ requestId }) : logger;
  } catch {
    return logger;
  }
}

/**
 * Edge-safe generator. Used by middleware to stamp every incoming request
 * with a unique id before it reaches Node handlers.
 */
export function generateRequestId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
