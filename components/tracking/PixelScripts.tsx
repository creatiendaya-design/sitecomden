"use client";

import { useEffect } from "react";
import Script from "next/script";

interface PixelScriptsProps {
  pixels: Array<{
    platform: string;
    config: any;
    testMode: boolean;
  }>;
}

export default function PixelScripts({ pixels }: PixelScriptsProps) {
  return (
    <>
      {pixels.map((pixel) => {
        switch (pixel.platform) {
          case "FACEBOOK":
            return <FacebookPixel key="fb" config={pixel.config} testMode={pixel.testMode} />;
          case "TIKTOK":
            return <TikTokPixel key="tt" config={pixel.config} testMode={pixel.testMode} />;
          case "GOOGLE_ADS":
            return <GoogleAdsPixel key="ga" config={pixel.config} />;
          case "GOOGLE_ANALYTICS":
            return <GoogleAnalyticsPixel key="ga4" config={pixel.config} />;
          default:
            return null;
        }
      })}
    </>
  );
}

// ============================================
// FACEBOOK PIXEL
// ============================================

function FacebookPixel({ config, testMode }: { config: any; testMode: boolean }) {
  useEffect(() => {
    if (typeof window !== "undefined" && config.pixelId) {
      // Inicializar Facebook Pixel
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

      const fbq = (window as any).fbq;

      // Init con o sin test event code
      if (testMode && config.testEventCode) {
        fbq("init", config.pixelId, {}, { eventID: config.testEventCode });
      } else {
        fbq("init", config.pixelId);
      }

      // PageView automático
      fbq("track", "PageView");
    }
  }, [config, testMode]);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${config.pixelId}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
}

// ============================================
// TIKTOK PIXEL
// ============================================

function TikTokPixel({ config, testMode }: { config: any; testMode: boolean }) {
  useEffect(() => {
    if (typeof window !== "undefined" && config.pixelId) {
      // Inicializar TikTok Pixel
      (function (w: any, d: any, t: any) {
        w.TiktokAnalyticsObject = t;
        var ttq = (w[t] = w[t] || []);
        ttq.methods = [
          "page",
          "track",
          "identify",
          "instances",
          "debug",
          "on",
          "off",
          "once",
          "ready",
          "alias",
          "group",
          "enableCookie",
          "disableCookie",
        ];
        ttq.setAndDefer = function (t: any, e: any) {
          t[e] = function () {
            t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
          };
        };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t: any) {
          for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)
            ttq.setAndDefer(e, ttq.methods[n]);
          return e;
        };
        ttq.load = function (e: any, n: any) {
          var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {};
          ttq._i[e] = [];
          ttq._i[e]._u = i;
          ttq._t = ttq._t || {};
          ttq._t[e] = +new Date();
          ttq._o = ttq._o || {};
          ttq._o[e] = n || {};
          var o = document.createElement("script");
          o.type = "text/javascript";
          o.async = true;
          o.src = i + "?sdkid=" + e + "&lib=" + t;
          var a = document.getElementsByTagName("script")[0];
          a.parentNode!.insertBefore(o, a);
        };

        ttq.load(config.pixelId);
        ttq.page();
      })(window, document, "ttq");
    }
  }, [config, testMode]);

  return null;
}

// ============================================
// GOOGLE ADS CONVERSION TRACKING
// ============================================

function GoogleAdsPixel({ config }: { config: any }) {
  return (
    <>
      <Script
        id="google-ads-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${config.conversionId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${config.conversionId}');
        `}
      </Script>
    </>
  );
}

// ============================================
// GOOGLE ANALYTICS 4
// ============================================

function GoogleAnalyticsPixel({ config }: { config: any }) {
  return (
    <>
      <Script
        id="google-analytics-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${config.measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}