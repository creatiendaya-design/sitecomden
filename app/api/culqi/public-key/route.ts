import { NextRequest, NextResponse } from "next/server";
import { getCulqiPublicKey } from "@/lib/culqi";

/**
 * GET /api/culqi/public-key
 * Obtiene la clave pública activa de Culqi
 */
export async function GET(request: NextRequest) {
  try {
    const publicKey = await getCulqiPublicKey();
    
    if (!publicKey) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontró configuración de Culqi",
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      publicKey,
    });
  } catch (error) {
    console.error("Error getting Culqi public key:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener la clave pública",
      },
      { status: 500 }
    );
  }
}