/**
 * Cliente de Culqi para procesar pagos con tarjeta
 * Documentación: https://docs.culqi.com/
 */

import { getActiveCulqiKeys } from "@/actions/culqi-settings";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "culqi" });
const CULQI_API_URL = "https://api.culqi.com/v2";

interface CulqiChargeData {
  amount: number; // En centavos (ej: 10000 = S/. 100.00)
  currency_code: string; // "PEN" o "USD"
  email: string;
  source_id: string; // Token del frontend
  description?: string;
  metadata?: Record<string, unknown>;
}

interface CulqiChargeResponse {
  object: string;
  id: string;
  creation_date: number;
  amount: number;
  currency_code: string;
  email: string;
  description: string;
  source: {
    object: string;
    id: string;
    type: string;
    creation_date: number;
    card_number: string;
    last_four: string;
    active: boolean;
    iin: {
      object: string;
      bin: string;
      card_brand: string;
      card_type: string;
      card_category: string;
      issuer: {
        name: string;
        country: string;
        country_code: string;
      };
    };
    client: {
      ip: string;
      ip_country: string;
      ip_country_code: string;
      browser: string;
      device_fingerprint: string | null;
      device_type: string | null;
    };
    metadata: Record<string, unknown>;
  };
  outcome: {
    type: string;
    code: string;
    merchant_message: string;
    user_message: string;
  };
  reference_code: string;
  authorization_code: string;
  metadata: Record<string, unknown>;
  total_fee: number;
  fee_details: {
    fixed_fee: {
      currency_code: string;
      amount: number;
    };
    variable_fee: {
      currency_code: string;
      commision: number;
      total: number;
    };
  };
  net_amount: number;
  duplicate_check: boolean;
  transfer_amount: number;
}

interface CulqiError {
  object: string;
  type: string;
  merchant_message: string;
  user_message: string;
  code: string;
}

/**
 * Obtener la clave pública activa de Culqi
 */
export async function getCulqiPublicKey(): Promise<string | null> {
  try {
    const keys = await getActiveCulqiKeys();

    if (!keys || !keys.publicKey) {
      log.error("Culqi public key not configured");
      return null;
    }

    return keys.publicKey;
  } catch (error) {
    log.error({ err: error }, "Failed to load Culqi public key");
    return null;
  }
}

/**
 * Crear un cargo con tarjeta usando Culqi
 */
export async function createCulqiCharge(
  data: CulqiChargeData
): Promise<{ success: boolean; data?: CulqiChargeResponse; error?: string }> {
  try {
    // Obtener la clave secreta activa
    const keys = await getActiveCulqiKeys();

    if (!keys || !keys.secretKey) {
      log.error("Culqi secret key not configured");
      return {
        success: false,
        error: "El sistema de pagos no está configurado. Contacta al administrador.",
      };
    }

    const CULQI_SECRET_KEY = keys.secretKey;
    const mode = keys.mode;

    log.info({ mode, amount: data.amount, currency: data.currency_code }, "Culqi charge request");

    const response = await fetch(`${CULQI_API_URL}/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CULQI_SECRET_KEY}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    // Si la respuesta no es OK, es un error
    if (!response.ok) {
      const error = result as CulqiError;
      log.error({ culqiError: error, mode }, "Culqi charge rejected");

      return {
        success: false,
        error: error.user_message || error.merchant_message || "Error al procesar el pago",
      };
    }

    const charge = result as CulqiChargeResponse;

    // Verificar que el cargo fue exitoso
    if (charge.outcome?.type !== "venta_exitosa") {
      log.error(
        { outcome: charge.outcome, chargeId: charge.id, mode },
        "Culqi charge unsuccessful outcome",
      );

      return {
        success: false,
        error: charge.outcome?.user_message || "El pago no pudo ser procesado",
      };
    }

    log.info({ chargeId: charge.id, mode, amount: charge.amount }, "Culqi charge successful");

    return {
      success: true,
      data: charge,
    };
  } catch (error) {
    log.error({ err: error }, "Culqi API request failed");
    return {
      success: false,
      error: "Error de conexión con el procesador de pagos",
    };
  }
}

/**
 * Obtener información de un cargo
 */
export async function getCulqiCharge(chargeId: string) {
  try {
    const keys = await getActiveCulqiKeys();
    
    if (!keys || !keys.secretKey) {
      throw new Error("Culqi no está configurado");
    }

    const response = await fetch(`${CULQI_API_URL}/charges/${chargeId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${keys.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener cargo: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    log.error({ err: error, chargeId }, "Failed to fetch Culqi charge");
    throw error;
  }
}

/**
 * Verificar que un cargo de webhook realmente existe y fue exitoso en Culqi.
 * Culqi no firma sus webhooks, así que verificamos contra su API directamente.
 */
export async function verifyCulqiCharge(
  chargeId: string,
  expectedAmount: number,
  expectedCurrency: string
): Promise<boolean> {
  try {
    const charge = await getCulqiCharge(chargeId);
    return (
      charge.object === "charge" &&
      charge.id === chargeId &&
      charge.outcome?.type === "venta_exitosa" &&
      charge.amount === expectedAmount &&
      charge.currency_code === expectedCurrency
    );
  } catch {
    return false;
  }
}

/**
 * Convertir soles a centavos (Culqi trabaja en centavos)
 */
export function solesToCents(soles: number): number {
  return Math.round(soles * 100);
}

/**
 * Convertir centavos a soles
 */
export function centsToSoles(cents: number): number {
  return cents / 100;
}

/**
 * Formatear información de tarjeta para mostrar al usuario
 */
export function formatCardInfo(charge: CulqiChargeResponse) {
  const { source } = charge;
  
  return {
    brand: source.iin?.card_brand || "Tarjeta",
    lastFour: source.last_four,
    type: source.iin?.card_type || "credit",
  };
}