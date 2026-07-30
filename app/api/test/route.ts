// app/api/test/route.ts
//
// Sonda de humo para desarrollo. No aporta nada en producción y sí superficie
// enumerable, así que allí responde 404 (auditoría ADV-20/25).
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({ message: "API funciona" });
}
