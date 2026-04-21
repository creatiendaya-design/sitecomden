import { prisma } from "@/lib/db";

export interface SiteSettings {
  // General
  site_name: string;
  site_logo: string;
  site_url: string;
  site_favicon: string;

  // SEO Home
  seo_home_title: string;
  seo_home_description: string;
  seo_home_keywords: string;
  seo_home_og_image: string;

  // Contact
  contact_email: string;
  contact_phone: string;
  contact_address: string;

  // Social
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_tiktok: string;

  // Orders
  order_prefix: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "ShopGood Perú",
  site_logo: "/logo.png",
  site_url: "https://shopgood.pe",
  site_favicon: "/favicon.ico",

  seo_home_title: "ShopGood Perú - Los Mejores Productos con Envío a Todo el País",
  seo_home_description: "Compra en línea con envío a todo el Perú. Múltiples métodos de pago: tarjeta, Yape, Plin, PayPal. Los mejores productos al mejor precio.",
  seo_home_keywords: "tienda online Perú, comprar en línea, envío Perú, Yape, Plin",
  seo_home_og_image: "/og-image.jpg",

  contact_email: "contacto@shopgood.pe",
  contact_phone: "+51 999 999 999",
  contact_address: "Lima, Perú",

  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
  social_tiktok: "",

  order_prefix: "PED",
};

/**
 * Extrae el valor de un setting, manejando objetos JSON con 'url'
 */
function extractSettingValue(value: any): any {
  // Si es un objeto JSON con 'url', extraer solo la URL
  if (value && typeof value === "object" && "url" in value) {
    return value.url;
  }
  return value;
}

/**
 * Obtiene todas las configuraciones del sitio
 * Si no existen en la BD, las crea automáticamente
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        OR: [
          { category: "seo" },
          { category: "general" },
          { category: "contact" },
          { category: "social" },
        ],
      },
    });

    // Si no hay settings, crear los defaults automáticamente
    if (!settings || settings.length === 0) {
      console.log('🔧 No settings found, creating defaults...');
      await createDefaultSettings();
      
      // Volver a consultar
      const newSettings = await prisma.setting.findMany({
        where: {
          OR: [
            { category: "seo" },
            { category: "general" },
            { category: "contact" },
            { category: "social" },
          ],
        },
      });

      const settingsObject = newSettings.reduce((acc, setting) => {
        acc[setting.key] = extractSettingValue(setting.value);
        return acc;
      }, {} as Record<string, any>);

      return {
        ...DEFAULT_SETTINGS,
        ...settingsObject,
      };
    }

    // Convertir array a objeto, extrayendo URLs de objetos JSON
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = extractSettingValue(setting.value);
      return acc;
    }, {} as Record<string, any>);

    // Combinar con defaults para asegurar que todos los campos existan
    return {
      ...DEFAULT_SETTINGS,
      ...settingsObject,
    };
  } catch (error) {
    console.error("❌ Error getting site settings:", error);
    console.warn('⚠️ Using default settings due to error');
    return DEFAULT_SETTINGS;
  }
}

/**
 * Crea los settings por defecto en la base de datos
 */
async function createDefaultSettings() {
  const defaultSettingsArray = [
    // General
    { key: 'site_name', value: 'ShopGood Perú', category: 'general' },
    { key: 'site_logo', value: '/logo.png', category: 'general' },
    { key: 'site_url', value: 'https://shopgood.pe', category: 'general' },
    { key: 'site_favicon', value: '/favicon.ico', category: 'general' },

    // SEO
    { 
      key: 'seo_home_title', 
      value: 'ShopGood Perú - Los Mejores Productos con Envío a Todo el País', 
      category: 'seo' 
    },
    { 
      key: 'seo_home_description', 
      value: 'Compra en línea con envío a todo el Perú. Múltiples métodos de pago: tarjeta, Yape, Plin, PayPal. Los mejores productos al mejor precio.', 
      category: 'seo' 
    },
    { 
      key: 'seo_home_keywords', 
      value: 'tienda online Perú, comprar en línea, envío Perú, Yape, Plin, e-commerce', 
      category: 'seo' 
    },
    { key: 'seo_home_og_image', value: '/og-image.jpg', category: 'seo' },

    // Contact
    { key: 'contact_email', value: 'contacto@shopgood.pe', category: 'contact' },
    { key: 'contact_phone', value: '+51 999 999 999', category: 'contact' },
    { key: 'contact_address', value: 'Lima, Perú', category: 'contact' },

    // Social
    { key: 'social_facebook', value: '', category: 'social' },
    { key: 'social_instagram', value: '', category: 'social' },
    { key: 'social_twitter', value: '', category: 'social' },
    { key: 'social_tiktok', value: '', category: 'social' },
  ];

  try {
    for (const setting of defaultSettingsArray) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }
    console.log('✅ Default settings created successfully');
  } catch (error) {
    console.error('❌ Error creating default settings:', error);
  }
}

/**
 * Obtiene un setting específico
 */
export async function getSetting(key: string, defaultValue: any = null) {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    return setting ? extractSettingValue(setting.value) : defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Actualiza o crea un setting
 */
export async function updateSetting(
  key: string,
  value: any,
  category?: string
) {
  return prisma.setting.upsert({
    where: { key },
    update: { value, category },
    create: { key, value, category },
  });
}