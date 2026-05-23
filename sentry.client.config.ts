import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Browser-side noise filter. None of these are bugs in our code:
 *   - ResizeObserver loop — fired by some browsers when layout work spans
 *     multiple frames; spec-compliant and harmless.
 *   - Navigation cancellations / AbortError — user navigated away mid-fetch.
 *   - Extension errors — Chrome/Firefox extensions throw into our window
 *     scope all the time (the Sentry FAQ lists these explicitly).
 *   - Network errors during page unload.
 *   - Yape/Plin/Culqi/Clerk iframe noise that we can't act on.
 */
const CLIENT_IGNORE_ERRORS: Array<string | RegExp> = [
  // Layout/render benign noise
  /ResizeObserver loop/i,
  /ResizeObserver completed/i,
  // User-initiated cancellations
  "AbortError",
  /The user aborted a request/i,
  /Failed to fetch/i,
  /NetworkError when attempting/i,
  /Load failed/i,
  /cancelled/i,
  // Browser-extension noise (Sentry's well-known list)
  /chrome-extension:/i,
  /moz-extension:/i,
  /safari-extension:/i,
  /safari-web-extension:/i,
  /webkit-masked-url/i,
  /Non-Error promise rejection captured/i,
  /Script error\.?$/i,
];

const CLIENT_DENY_URLS = [
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /^safari-(web-)?extension:/i,
];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    ignoreErrors: CLIENT_IGNORE_ERRORS,
    denyUrls: CLIENT_DENY_URLS,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
