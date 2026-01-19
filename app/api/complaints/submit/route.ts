import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const formData = body.formData || body;
    
    console.log("📥 Datos recibidos del formulario:");
    console.log(JSON.stringify(formData, null, 2));

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

    // Convertir IDs a labels
    const dataByLabel: Record<string, any> = {};
    for (const [fieldId, value] of Object.entries(formData)) {
      const label = fieldMappings[fieldId];
      if (label) {
        dataByLabel[label] = value;
        console.log(`  ${fieldId} → "${label}" = "${value}"`);
      } else {
        console.log(`  ⚠️ Campo desconocido: ${fieldId} = "${value}"`);
        // Guardar campos desconocidos con su ID
        dataByLabel[fieldId] = value;
      }
    }

    console.log("\n📊 Datos mapeados por label:");
    console.log(JSON.stringify(dataByLabel, null, 2));

    // Extraer datos específicos para campos del modelo
    const customerName = [
      dataByLabel["Nombres"],
      dataByLabel["Apellido Paterno"],
      dataByLabel["Apellido Materno"],
    ]
      .filter(Boolean)
      .join(" ");

    const customerEmail = dataByLabel["Email"];
    const customerPhone = dataByLabel["Teléfono"];

    console.log("\n🔍 Campos extraídos:");
    console.log({
      customerName,
      customerEmail,
      customerPhone,
    });

    // Obtener IP y User Agent del request
    const ipAddress = req.headers.get("x-forwarded-for") || 
                      req.headers.get("x-real-ip") || 
                      null;
    const userAgent = req.headers.get("user-agent") || null;

    console.log("\n💾 Generando número de reclamo...");

    // Obtener configuración del sistema (prefijo personalizado)
    const configSetting = await prisma.setting.findUnique({
      where: { key: "complaints_config" },
    });
    
    // Usar prefijo de configuración o "REC" por defecto
    const configValue = configSetting?.value as { prefix?: string; emailSubject?: string; emailMessage?: string } | null;
    const prefix = configValue?.prefix || "REC";
    
    // Generar número de reclamo secuencial: {PREFIX}-YYYY-###
    const currentYear = new Date().getFullYear();
    
    // Contar reclamos del año actual con este prefijo
    const countThisYear = await prisma.complaint.count({
      where: {
        complaintNumber: {
          startsWith: `${prefix}-${currentYear}-`,
        },
      },
    });
    
    // Siguiente número secuencial (empezar en 1)
    const nextNumber = countThisYear + 1;
    
    // Formatear con padding de 3 dígitos: 001, 002, etc.
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    // Formato final: REC-2025-001 (o el prefijo configurado)
    const complaintNumber = `${prefix}-${currentYear}-${paddedNumber}`;
    
    console.log("   Prefijo configurado:", prefix);
    console.log("   Número generado:", complaintNumber);

    // Guardar en base de datos
    const complaint = await prisma.complaint.create({
      data: {
        // Número de reclamo personalizado
        complaintNumber,
        
        // formData: todos los datos originales con IDs + labels
        formData: {
          original: formData,         // IDs originales
          mapped: dataByLabel,        // Datos mapeados a labels
          submittedAt: new Date().toISOString(),
        } as any,
        
        // Campos específicos extraídos
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        
        // Metadata del request
        ipAddress,
        userAgent,
        
        // status: "PENDING" es el default, no hace falta especificarlo
      },
    });

    console.log("✅ Reclamo creado exitosamente:");
    console.log("   ID:", complaint.id);
    console.log("   Número de reclamo:", complaint.complaintNumber);
    console.log("   Nombre:", complaint.customerName);
    console.log("   Email:", complaint.customerEmail);
    console.log("   Estado:", complaint.status);

    // 📧 ENVIAR EMAIL DE CONFIRMACIÓN AL CLIENTE
    if (customerEmail) {
      try {
        console.log("\n📧 Enviando email de confirmación...");
        
        // Importar función de envío de email
        const { sendEmail } = await import("@/lib/email");

        const emailSubject = configValue?.emailSubject || "Reclamación Recibida";
        const emailMessage = configValue?.emailMessage || 
          "Hemos recibido su reclamación y será atendida a la brevedad. Nuestro equipo revisará su caso y se pondrá en contacto con usted en un plazo máximo de 15 días hábiles.";

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

        console.log("   ✅ Email enviado exitosamente a:", customerEmail);
      } catch (emailError) {
        console.error("   ❌ Error enviando email:", emailError);
        // No fallar la petición si el email falla
        // El reclamo ya fue guardado exitosamente
      }
    } else {
      console.log("\n⚠️  No se envió email (cliente no proporcionó email)");
    }


    return NextResponse.json({
      success: true,
      message: "Reclamo registrado exitosamente",
      complaintNumber: complaint.complaintNumber, // ← En raíz para frontend
      data: {
        id: complaint.id,
        complaintNumber: complaint.complaintNumber,
        createdAt: complaint.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error submitting complaint:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al procesar el reclamo. Intente nuevamente.",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}