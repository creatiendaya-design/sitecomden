import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // jsdom is loaded (dynamically) only to sanitize uploaded SVGs. Keep it as an
  // external server package so Next doesn't try to bundle its dynamic requires.
  serverExternalPackages: ["jsdom"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // ✅ Agregado para subir imágenes OG
    },
  },
  // GEO: expose the markdown variant of each product under the LLM-friendly
  // `/productos/[slug].md` URL. Internally it resolves to the catch-all
  // route at app/productos/[slug]/markdown/route.ts (Next does not allow
  // `.md` in folder names directly).
  async rewrites() {
    return [
      {
        source: '/productos/:slug.md',
        destination: '/productos/:slug/markdown',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'ssl.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'primedecor.pk',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: 'videodelivery.net',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflarestream.com',
      },
    ],
      formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
  },
};

// Sentry — wrapper opt-in. If SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT
// are not set, source-map upload is skipped silently and the SDK still works
// in runtime (it just won't symbolicate). DSN is read at runtime by
// sentry.*.config.ts; without it, Sentry is a no-op.
const sentryEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;