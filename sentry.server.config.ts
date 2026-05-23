import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Transport-level noise filter. These are NOT bugs:
 *   - "aborted" → client closed the connection mid-response (user
 *     navigated away, browser tab closed, mobile app suspended).
 *   - ECONNRESET / ECONNREFUSED / ETIMEDOUT / EPIPE → standard TCP
 *     hiccups between Vercel edge ⇄ Node runtime.
 *   - BodyStreamBuffer / fetch failed → upstream cancellation.
 *
 * Filtering at `ignoreErrors` keeps these from ever reaching the
 * Sentry quota or polluting the Issues feed. Real exceptions still
 * land normally — the matchers are very narrow on purpose.
 */
const SERVER_IGNORE_ERRORS: Array<string | RegExp> = [
  "aborted",
  /Request aborted/i,
  /BodyStreamBuffer was aborted/i,
  /aborted by the client/i,
  // Node socket noise
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  // Generic Node fetch cancellation
  /^fetch failed$/i,
  /UND_ERR_/, // undici lifecycle errors
];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    ignoreErrors: SERVER_IGNORE_ERRORS,
    beforeSend(event, hint) {
      // Final safety net: `ignoreErrors` matches on message, but some Node
      // aborts surface as Error instances whose .name is "AbortError" and
      // whose message format varies. Drop them here too.
      const err = hint.originalException;
      if (err instanceof Error) {
        if (err.name === "AbortError") return null;
        if (err.message === "aborted") return null;
        // Connection-level codes attached as a property by Node.
        const code = (err as Error & { code?: string }).code;
        if (
          code &&
          ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"].includes(
            code,
          )
        ) {
          return null;
        }
      }
      return event;
    },
  });
}
