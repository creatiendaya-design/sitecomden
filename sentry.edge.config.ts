import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    // Same transport-level noise filter as the Node runtime — see
    // sentry.server.config.ts for the rationale.
    ignoreErrors: [
      "aborted",
      /Request aborted/i,
      /aborted by the client/i,
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "EPIPE",
      /^fetch failed$/i,
    ],
    beforeSend(event, hint) {
      const err = hint.originalException;
      if (err instanceof Error && err.name === "AbortError") return null;
      return event;
    },
  });
}
