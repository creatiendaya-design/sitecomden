import { NextResponse } from "next/server";
import { getActiveMercadoPagoKeys } from "@/lib/mercadopago/config";

/**
 * GET /api/mercadopago/public-key
 *
 * Clave PÚBLICA activa de MercadoPago, para inicializar el SDK del navegador
 * (Card Payment Brick). Es pública por diseño —solo sirve para tokenizar— pero
 * el access token vive en el mismo objeto de configuración, así que aquí se
 * devuelve exclusivamente `publicKey`: nada de propagar el objeto entero.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const keys = await getActiveMercadoPagoKeys();

    if (!keys?.publicKey) {
      return NextResponse.json(
        { success: false, error: "MercadoPago no está configurado" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      publicKey: keys.publicKey,
      mode: keys.mode,
    });
  } catch (error) {
    console.error("Error getting MercadoPago public key:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener la clave pública" },
      { status: 500 }
    );
  }
}
