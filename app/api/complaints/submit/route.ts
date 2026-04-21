import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withRateLimit, formRateLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await withRateLimit(req, formRateLimiter, {
    action: "complaint_submit",
    errorMessage: "Demasiados intentos. Intenta nuevamente más tarde.",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    const formData = body.formData || body;

    // Mapeo manual de IDs a labels
    const fieldMappings: Record<string, string> = {
      "cmkfr740p00022xswtmf1q67x": "Tipo de Documento",
      "cmkfr81wy000a2xswj9uykejg": "Nro. Documento",
      "cmkfr822w000b2xswipqc90vu": "Apellido Paterno",
      "cmkfr828v000c2xswqk93fnal": "Apellido Materno",
      "cmkfr82ew000d2xswddypfba2": "Nombres",
      "cmkfr82r2000f2xswbr4kjh7g": "Dirección",
      "cmkftgs81000g2xswan8waz2s": "Código Postal",
      "cmkftgsz6000k2xswy0xldudu": "Departamento",
      "cmkftgt55000l2xswvxhqkgay": "Provincia",
      "cmkftgtb4000m2xswyqcehad5": "Distrito",
      "cmkftgttc000p2xswgp7qz3xh": "Teléfono",
      "cmkftgtzb000q2xswwn6vnh9t": "Email",
      "cmkftgu58000r2xsw8iqeqmt4": "Descripción del Bien",
      "cmkftgub7000s2xswswmo110y": "Monto",
      "cmkftguh8000t2xsw3l1b1ltd": "Tipo de Reclamo",
      "cmkftgut3000v2xswfcfb4jtl": "Detalle",
      "cmkftguz4000w2xswy2yg5eaf": "Pedido",
    };

    const dataByLabel: Record<string, unknown> = {};
    for (const [fieldId, value] of Object.entries(formData)) {
      const label = fieldMappings[fieldId];
      dataByLabel[label ?? fieldId] = value;
    }

    const customerName = [
      dataByLabel["Nombres"],
      dataByLabel["Apellido Paterno"],
      dataByLabel["Apellido Materno"],
    ]
      .filter(Boolean)
      .join(" ");

    const customerEmail = dataByLabel["Email"] as string | undefined;
    const customerPhone = dataByLabel["Teléfono"] as string | undefined;

    const ipAddress =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    const configSetting = await prisma.setting.findUnique({
      where: { key: "complaints_config" },
    });

    const configValue = configSetting?.value as {
      prefix?: string;
      emailSubject?: string;
      emailMessage?: string;
    } | null;
    const prefix = configValue?.prefix || "REC";
    const currentYear = new Date().getFullYear();

    const countThisYear = await prisma.complaint.count({
      where: { complaintNumber: { startsWith: `${prefix}-${currentYear}-` } },
    });

    const complaintNumber = `${prefix}-${currentYear}-${String(countThisYear + 1).padStart(3, "0")}`;

    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        formData: {
          original: formData,
          mapped: dataByLabel,
          submittedAt: new Date().toISOString(),
        } as any,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        ipAddress,
        userAgent,
      },
    });

    if (customerEmail) {
      try {
        const { sendEmail } = await import("@/lib/email");
        const emailSubject = configValue?.emailSubject || "Reclamación Recibida";
        const emailMessage =
          configValue?.emailMessage ||
          "Hemos recibido su reclamación y será atendida a la brevedad.";

        await sendEmail({
          to: customerEmail,
          subject: `${emailSubject} - ${complaint.complaintNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Reclamación Registrada</h2>
              <p>Estimado/a ${customerName || "cliente"},</p>
              <p>${emailMessage}</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Número de Reclamación:</strong> ${complaint.complaintNumber}</p>
                <p style="margin: 10px 0 0 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-PE")}</p>
              </div>
              <p>Por favor conserve este número para dar seguimiento a su caso.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Este es un mensaje automático, por favor no responder.
              </p>
            </div>
          `,
        });
      } catch {
        // No fallar la petición si el email falla
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reclamo registrado exitosamente",
      complaintNumber: complaint.complaintNumber,
      data: {
        id: complaint.id,
        complaintNumber: complaint.complaintNumber,
        createdAt: complaint.createdAt,
      },
    });
  } catch (error) {
    console.error("Error submitting complaint:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { success: false, error: "Error al procesar el reclamo. Intente nuevamente." },
      { status: 500 }
    );
  }
}
