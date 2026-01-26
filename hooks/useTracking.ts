"use client";

import { useCallback } from "react";

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
  [key: string]: any;
}

export function useTracking() {
  const trackEvent = useCallback((event: TrackingEvent, data?: EventData) => {
    if (typeof window === "undefined") return;

    // Facebook Pixel
    if ((window as any).fbq) {
      (window as any).fbq("track", event, data);
    }

    // TikTok Pixel
    if ((window as any).ttq) {
      (window as any).ttq.track(event, data);
    }

    // Google Analytics 4
    if ((window as any).gtag) {
      const eventName = convertToGA4EventName(event);
      (window as any).gtag("event", eventName, {
        value: data?.value,
        currency: data?.currency,
        items: data?.contents,
        ...data,
      });
    }
  }, []);

  const trackPageView = useCallback((url: string) => {
    if (typeof window === "undefined") return;

    // Facebook Pixel
    if ((window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }

    // TikTok Pixel
    if ((window as any).ttq) {
      (window as any).ttq.page();
    }

    // Google Analytics 4
    if ((window as any).gtag) {
      (window as any).gtag("event", "page_view", {
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