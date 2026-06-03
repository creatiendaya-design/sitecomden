import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { registerCustomer } from "@/actions/loyalty";
import { prisma } from "@/lib/db";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const headerPayload = await headers();
    const svixId = headerPayload.get("svix-id");
    const svixTimestamp = headerPayload.get("svix-timestamp");
    const svixSignature = headerPayload.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json(
        { error: "Missing svix headers" },
        { status: 400 }
      );
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    interface ClerkEventData {
      id?: string;
      email_addresses: Array<{ email_address: string }>;
      first_name?: string;
      last_name?: string;
      unsafe_metadata?: Record<string, unknown>;
    }

    interface ClerkEvent {
      type: string;
      data: ClerkEventData;
    }

    const wh = new Webhook(webhookSecret);
    const evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;

    const eventType = evt.type;

    // Usuario creado en Clerk
    if (eventType === "user.created") {
      const { email_addresses, first_name, last_name, unsafe_metadata } = evt.data;

      const email = email_addresses[0]?.email_address;
      if (!email) {
        return NextResponse.json({ error: "No email found" }, { status: 400 });
      }

      const name = `${first_name || ""} ${last_name || ""}`.trim() || email.split("@")[0];
      const referralCode = unsafe_metadata?.referralCode as string | undefined;

      console.log("🔔 Webhook: Usuario creado en Clerk:", email);
      console.log("📋 Código de referido:", referralCode || "Ninguno");

      // Verificar si ya existe customer
      const existing = await prisma.customer.findUnique({
        where: { email },
      });

      if (!existing) {
        // Crear customer con sistema de lealtad
        const result = await registerCustomer({
          email,
          name,
          referralCode: referralCode || undefined,
        });

        if (result.success) {
          console.log("✅ Customer creado con sistema de lealtad:", email);
        } else {
          console.error("❌ Error creando customer:", result.error);
        }
      } else {
        console.log("ℹ️ Customer ya existe:", email);
      }
    }

    // Usuario actualizado en Clerk
    if (eventType === "user.updated") {
      const { email_addresses, first_name, last_name } = evt.data;

      const email = email_addresses[0]?.email_address;
      if (!email) {
        return NextResponse.json({ error: "No email found" }, { status: 400 });
      }

      const name = `${first_name || ""} ${last_name || ""}`.trim();

      // Actualizar customer
      await prisma.customer.update({
        where: { email },
        data: { name },
      });

      console.log("✅ Customer actualizado:", email);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Error en webhook de Clerk:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 400 }
    );
  }
}