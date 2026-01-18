// Culqi Integration
// Docs: https://docs.culqi.com/

export interface CulqiToken {
  id: string;
  type: string;
  email: string;
  card_number: string;
  last_four: string;
  active: boolean;
  iin: {
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
    device_fingerprint: string;
    device_type: string;
  };
  metadata: Record<string, any>;
}

export interface CulqiCharge {
  id: string;
  amount: number;
  currency_code: string;
  email: string;
  description: string;
  source_id: string;
}

// Cliente para crear cargos (server-side)
export class CulqiClient {
  private secretKey: string;
  private baseUrl = "https://api.culqi.com/v2";

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async createCharge(data: {
    amount: number; // en centavos (ej: 10000 = S/. 100.00)
    currency_code: string; // "PEN"
    email: string;
    source_id: string; // token de Culqi
    description: string;
    metadata?: Record<string, any>;
  }): Promise<CulqiCharge> {
    const response = await fetch(`${this.baseUrl}/charges`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.user_message || "Error al procesar el pago");
    }

    return response.json();
  }

  async getCharge(chargeId: string): Promise<CulqiCharge> {
    const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Error al obtener información del cargo");
    }

    return response.json();
  }
}

// Instancia del cliente
// Instancia del cliente (comentado por ahora)
export const culqi = process.env.CULQI_SECRET_KEY 
  ? new CulqiClient(process.env.CULQI_SECRET_KEY)
  : null as any;