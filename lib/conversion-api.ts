import { prisma } from "@/lib/db";
import crypto from "crypto";

// ============================================
// TIPOS
// ============================================

interface ConversionEventData {
  eventName: string;
  eventTime?: number;
  eventId?: string;
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    contentIds?: string[];
    contentName?: string;
    contentType?: string;
    contents?: Array<{ id: string; quantity: number; item_price: number }>;
    numItems?: number;
  };
  sourceUrl?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
}

// ============================================
// FACEBOOK CONVERSION API
// ============================================

export async function sendFacebookConversion(data: ConversionEventData) {
  try {
    // Obtener configuración de Facebook
    const pixelConfig = await prisma.trackingPixel.findFirst({
      where: {
        platform: "FACEBOOK",
        enabled: true,
      },
    });

    if (!pixelConfig || !pixelConfig.config) {
      console.log("Facebook Pixel no configurado o deshabilitado");
      return { success: false, error: "Pixel no configurado" };
    }

    const config = pixelConfig.config as any;
    const { pixelId, accessToken, testEventCode } = config;

    if (!pixelId || !accessToken) {
      console.log("Facebook Pixel ID o Access Token faltante");
      return { success: false, error: "Credenciales incompletas" };
    }

    // Hash de datos de usuario (requerido por Facebook)
    const hashedUserData: any = {};
    if (data.userData?.email) {
      hashedUserData.em = hashData(data.userData.email.toLowerCase().trim());
    }
    if (data.userData?.phone) {
      hashedUserData.ph = hashData(
        data.userData.phone.replace(/[^0-9]/g, "")
      );
    }
    if (data.userData?.firstName) {
      hashedUserData.fn = hashData(data.userData.firstName.toLowerCase().trim());
    }
    if (data.userData?.lastName) {
      hashedUserData.ln = hashData(data.userData.lastName.toLowerCase().trim());
    }
    if (data.userData?.city) {
      hashedUserData.ct = hashData(data.userData.city.toLowerCase().trim());
    }
    if (data.userData?.state) {
      hashedUserData.st = hashData(data.userData.state.toLowerCase().trim());
    }
    if (data.userData?.zipCode) {
      hashedUserData.zp = hashData(data.userData.zipCode.replace(/[^0-9]/g, ""));
    }
    if (data.userData?.country) {
      hashedUserData.country = hashData(data.userData.country.toLowerCase().trim());
    }

    // Construir payload
    const payload = {
      data: [
        {
          event_name: data.eventName,
          event_time: data.eventTime || Math.floor(Date.now() / 1000),
          event_id: data.eventId || generateEventId(),
          event_source_url: data.sourceUrl || "https://shopgood.pe",
          action_source: "website",
          user_data: {
            ...hashedUserData,
            client_ip_address: data.clientIpAddress,
            client_user_agent: data.clientUserAgent,
          },
          custom_data: data.customData || {},
        },
      ],
      ...(testEventCode && pixelConfig.testMode && { test_event_code: testEventCode }),
    };

    // Enviar a Facebook
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Error en Facebook Conversion API:", result);
      return { success: false, error: result.error?.message || "Error desconocido" };
    }

    console.log("✅ Facebook Conversion enviado:", data.eventName);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error enviando Facebook Conversion:", error);
    return { success: false, error: "Error de conexión" };
  }
}

// ============================================
// TIKTOK EVENTS API
// ============================================

export async function sendTikTokConversion(data: ConversionEventData) {
  try {
    // Obtener configuración de TikTok
    const pixelConfig = await prisma.trackingPixel.findFirst({
      where: {
        platform: "TIKTOK",
        enabled: true,
      },
    });

    if (!pixelConfig || !pixelConfig.config) {
      console.log("TikTok Pixel no configurado o deshabilitado");
      return { success: false, error: "Pixel no configurado" };
    }

    const config = pixelConfig.config as any;
    const { pixelId, accessToken } = config;

    if (!pixelId || !accessToken) {
      console.log("TikTok Pixel ID o Access Token faltante");
      return { success: false, error: "Credenciales incompletas" };
    }

    // Hash de datos de usuario
    const hashedUserData: any = {};
    if (data.userData?.email) {
      hashedUserData.email = hashData(data.userData.email.toLowerCase().trim());
    }
    if (data.userData?.phone) {
      hashedUserData.phone_number = hashData(
        data.userData.phone.replace(/[^0-9]/g, "")
      );
    }

    // Construir payload
    const payload = {
      pixel_code: pixelId,
      event: data.eventName,
      timestamp: data.eventTime || Math.floor(Date.now() / 1000),
      event_id: data.eventId || generateEventId(),
      context: {
        page: {
          url: data.sourceUrl || "https://shopgood.pe",
        },
        user_agent: data.clientUserAgent,
        ip: data.clientIpAddress,
      },
      properties: data.customData || {},
      ...(Object.keys(hashedUserData).length > 0 && { user: hashedUserData }),
    };

    // Enviar a TikTok
    const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      console.error("Error en TikTok Events API:", result);
      return { success: false, error: result.message || "Error desconocido" };
    }

    console.log("✅ TikTok Event enviado:", data.eventName);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error enviando TikTok Event:", error);
    return { success: false, error: "Error de conexión" };
  }
}

// ============================================
// GOOGLE ADS CONVERSION
// ============================================

export async function sendGoogleAdsConversion(
  value: number,
  currency: string,
  transactionId: string
) {
  try {
    // Obtener configuración de Google Ads
    const pixelConfig = await prisma.trackingPixel.findFirst({
      where: {
        platform: "GOOGLE_ADS",
        enabled: true,
      },
    });

    if (!pixelConfig || !pixelConfig.config) {
      console.log("Google Ads no configurado o deshabilitado");
      return { success: false, error: "Pixel no configurado" };
    }

    const config = pixelConfig.config as any;
    const { conversionId, conversionLabel } = config;

    if (!conversionId || !conversionLabel) {
      console.log("Google Ads Conversion ID o Label faltante");
      return { success: false, error: "Credenciales incompletas" };
    }

    // Google Ads se maneja principalmente client-side
    // Aquí podríamos implementar Google Ads API si tuviéramos credenciales OAuth
    console.log("✅ Google Ads Conversion registrado (client-side):", {
      conversionId,
      conversionLabel,
      value,
      currency,
      transactionId,
    });

    return { success: true };
  } catch (error) {
    console.error("Error registrando Google Ads Conversion:", error);
    return { success: false, error: "Error de conexión" };
  }
}

// ============================================
// GOOGLE ANALYTICS 4 MEASUREMENT PROTOCOL
// ============================================

export async function sendGA4Conversion(data: ConversionEventData) {
  try {
    // Obtener configuración de GA4
    const pixelConfig = await prisma.trackingPixel.findFirst({
      where: {
        platform: "GOOGLE_ANALYTICS",
        enabled: true,
      },
    });

    if (!pixelConfig || !pixelConfig.config) {
      console.log("Google Analytics 4 no configurado o deshabilitado");
      return { success: false, error: "Pixel no configurado" };
    }

    const config = pixelConfig.config as any;
    const { measurementId, apiSecret } = config;

    if (!measurementId || !apiSecret) {
      console.log("GA4 Measurement ID o API Secret faltante");
      return { success: false, error: "Credenciales incompletas" };
    }

    // Generar client ID único
    const clientId = generateClientId();

    // Construir payload para Measurement Protocol
    const payload = {
      client_id: clientId,
      events: [
        {
          name: convertToGA4EventName(data.eventName),
          params: {
            value: data.customData?.value,
            currency: data.customData?.currency || "PEN",
            transaction_id: data.eventId,
            items: data.customData?.contents,
            ...data.customData,
          },
        },
      ],
    };

    // Enviar a GA4 Measurement Protocol
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error en GA4 Measurement Protocol:", errorText);
      return { success: false, error: "Error en API" };
    }

    console.log("✅ GA4 Event enviado:", data.eventName);
    return { success: true };
  } catch (error) {
    console.error("Error enviando GA4 Event:", error);
    return { success: false, error: "Error de conexión" };
  }
}

// ============================================
// FUNCIÓN PRINCIPAL: ENVIAR A TODAS LAS PLATAFORMAS
// ============================================

export async function trackConversion(
  eventName: string,
  {
    email,
    phone,
    firstName,
    lastName,
    value,
    currency = "PEN",
    transactionId,
    items,
    sourceUrl,
    clientIp,
    clientUserAgent,
  }: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    value?: number;
    currency?: string;
    transactionId?: string;
    items?: Array<{ id: string; quantity: number; item_price: number }>;
    sourceUrl?: string;
    clientIp?: string;
    clientUserAgent?: string;
  }
) {
  const eventData: ConversionEventData = {
    eventName,
    eventId: transactionId || generateEventId(),
    userData: {
      email,
      phone,
      firstName,
      lastName,
      country: "PE",
    },
    customData: {
      value,
      currency,
      contents: items,
      numItems: items?.reduce((acc, item) => acc + item.quantity, 0),
    },
    sourceUrl,
    clientIpAddress: clientIp,
    clientUserAgent,
  };

  // Enviar a todas las plataformas en paralelo
  const results = await Promise.allSettled([
    sendFacebookConversion(eventData),
    sendTikTokConversion(eventData),
    sendGoogleAdsConversion(value || 0, currency, transactionId || ""),
    sendGA4Conversion(eventData),
  ]);

  console.log("📊 Resultados de tracking:", results);

  return {
    success: true,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : null)),
  };
}

// ============================================
// UTILIDADES
// ============================================

function hashData(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateClientId(): string {
  return `${Date.now()}.${Math.random().toString(36).substring(2, 11)}`;
}

function convertToGA4EventName(eventName: string): string {
  const mapping: Record<string, string> = {
    Purchase: "purchase",
    ViewContent: "view_item",
    AddToCart: "add_to_cart",
    InitiateCheckout: "begin_checkout",
    AddPaymentInfo: "add_payment_info",
    Search: "search",
    CompleteRegistration: "sign_up",
  };

  return mapping[eventName] || eventName.toLowerCase();
}