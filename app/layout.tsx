import type { Metadata, Viewport } from "next";
import { Rubik, Nunito_Sans, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { Toaster } from "sonner";
import { getSiteSettings } from "@/lib/site-settings";
import { getCspNonce } from "@/lib/csp";
import "./globals.css";
import "@/app/styles/prose-content.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// `interactive-widget=resizes-content` makes mobile browsers reflow the layout
// when the on-screen keyboard opens, so focused inputs scroll above sticky
// bars / fixed footers (e.g. the checkout pay bar) instead of being covered.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: {
      default: settings.site_name,
      template: `%s | ${settings.site_name}`,
    },
    description: settings.seo_home_description,
    keywords: settings.seo_home_keywords.split(",").map((k) => k.trim()),
    authors: [{ name: settings.site_name }],
    creator: settings.site_name,
    publisher: settings.site_name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(settings.site_url),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "es_PE",
      url: settings.site_url,
      siteName: settings.site_name,
      title: settings.site_name,
      description: settings.seo_home_description,
      images: settings.seo_home_og_image ? [settings.seo_home_og_image] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.site_name,
      description: settings.seo_home_description,
      images: settings.seo_home_og_image ? [settings.seo_home_og_image] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: settings.site_favicon
      ? {
          icon: settings.site_favicon,
          apple: settings.site_favicon,
        }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getCspNonce();

  return (
    <ClerkProvider localization={esES} nonce={nonce}>
      <html lang="es" suppressHydrationWarning>
        <body
          className={`${rubik.variable} ${nunitoSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster position="top-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}