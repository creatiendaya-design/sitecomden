import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { Toaster } from "sonner";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";
import "@/app/styles/prose-content.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    icons: {
      icon: [
        { url: settings.site_favicon || "/favicon.ico" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/manifest.json",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <Toaster position="top-right" richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}