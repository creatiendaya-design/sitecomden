"use client";

import { useCallback } from "react";
import { hasMarketingConsent } from "@/lib/consent";

export type TrackingEvent =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "Search"
  | "CompleteRegistration";

interface EventData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  contents?: Array<{ id: string; quantity: number; item_price: number }>;
  num_items?: number;
  [key: string]: unknown;
}

export function useTracking() {
  const trackEvent = useCallback((event: TrackingEvent, data?: EventData) => {
    if (typeof window === "undefined") return;
    if (!hasMarketingConsent()) return;

    // Facebook Pixel
    if (window.fbq) {
      window.fbq("track", event, data);
    }

    // TikTok Pixel
    if (window.ttq && typeof (window.ttq as Record<string, unknown>).track === "function") {
      (window.ttq as { track: (...args: unknown[]) => void }).track(event, data);
    }

    // Google Analytics 4
    if (window.gtag) {
      const eventName = convertToGA4EventName(event);
      window.gtag("event", eventName, {
        value: data?.value,
        currency: data?.currency,
        items: data?.contents,
        ...data,
      });
    }
  }, []);

  const trackPageView = useCallback((url: string) => {
    if (typeof window === "undefined") return;
    if (!hasMarketingConsent()) return;

    // Facebook Pixel
    if (window.fbq) {
      window.fbq("track", "PageView");
    }

    // TikTok Pixel
    if (window.ttq && typeof (window.ttq as Record<string, unknown>).page === "function") {
      (window.ttq as { page: () => void }).page();
    }

    // Google Analytics 4
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_path: url,
      });
    }
  }, []);

  return { trackEvent, trackPageView };
}

// Convertir eventos de Facebook/TikTok a eventos de GA4
function convertToGA4EventName(event: TrackingEvent): string {
  const mapping: Record<TrackingEvent, string> = {
    ViewContent: "view_item",
    AddToCart: "add_to_cart",
    InitiateCheckout: "begin_checkout",
    AddPaymentInfo: "add_payment_info",
    Purchase: "purchase",
    Search: "search",
    CompleteRegistration: "sign_up",
  };

  return mapping[event] || event.toLowerCase();
}
