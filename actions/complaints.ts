"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

// ==========================================
// GESTIÓN DE CAMPOS DEL FORMULARIO
// ==========================================

export async function getFormFields() {
  try {
    const fields = await prisma.complaintFormField.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: fields,
    };
  } catch (error) {
    console.error("Error fetching form fields:", error);
    return {
      success: false,
      error: "Error al obtener campos del formulario",
      data: [],
    };
  }
}

export async function getAllFormFields() {
  try {
    const fields = await prisma.complaintFormField.findMany({
      orderBy: { order: "asc" },
    });

    return {
      success: true,
      data: fields,
    };
  } catch (error) {
    console.error("Error fetching all form fields:", error);
    return {
      success: false,
      error: "Error al obtener campos del formulario",
      data: [],
    };
  }
}

export async function createFormField(data: {
  label: string;
  fieldType: string;
  section?: string;
  width?: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[]; // ✅ Sin null
  otherLabel?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}) {
  try {
    // Obtener el último order
    const lastField = await prisma.complaintFormField.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (lastField?.order || 0) + 1;

    const field = await prisma.complaintFormField.create({
      data: {
        label: data.label,
        fieldType: data.fieldType,
        section: data.section,
        width: data.width || "full",
        placeholder: data.placeholder,
        helpText: data.helpText,
        required: data.required,
        // ✅ Conversión explícita: array con elementos o undefined
        options: data.options && data.options.length > 0 ? data.options : undefined,
        otherLabel: data.otherLabel,
        minLength: data.minLength,
        maxLength: data.maxLength,
        pattern: data.pattern,
        order: nextOrder,
        active: true,
      },
    });

    revalidatePath("/admin/libro-reclamaciones");

    return {
      success: true,
      data: field,
    };
  } catch (error) {
    console.error("Error creating form field:", error);
    return {
      success: false,
      error: "Error al crear campo",
    };
  }
}

export async function updateFormField(
  id: string,
  data: {
    label?: string;
    fieldType?: string;
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    options?: string[]; // ✅ Sin null
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    active?: boolean;
  }
) {
  try {
    // ✅ Preparar data con conversión explícita
    const updateData: any = {};
    
    if (data.label !== undefined) updateData.label = data.label;
    if (data.fieldType !== undefined) updateData.fieldType = data.fieldType;
    if (data.placeholder !== undefined) updateData.placeholder = data.placeholder;
    if (data.helpText !== undefined) updateData.helpText = data.helpText;
    if (data.required !== undefined) updateData.required = data.required;
    if (data.minLength !== undefined) updateData.minLength = data.minLength;
    if (data.maxLength !== undefined) updateData.maxLength = data.maxLength;
    if (data.pattern !== undefined) updateData.pattern = data.pattern;
    if (data.active !== undefined) updateData.active = data.active;
    
    // ✅ Manejo especial para options
    if (data.options !== undefined) {
      updateData.options = data.options && data.options.length > 0 ? data.options : undefined;
    }

    const field = await prisma.complaintFormField.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/libro-reclamaciones");

    return {
      success: true,
      data: field,
    };
  } catch (error) {
    console.error("Error updating form field:", error);
    return {
      success: false,
      error: "Error al actualizar campo",
    };
  }
}

export async function deleteFormField(id: string) {
  try {
    await prisma.complaintFormField.delete({
      where: { id },
    });

    revalidatePath("/admin/libro-reclamaciones");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting form field:", error);
    return {
      success: false,
      error: "Error al eliminar campo",
    };
  }
}

export async function reorderFormFields(fieldIds: string[]) {
  try {
    // Actualizar el orden de cada campo
    await Promise.all(
      fieldIds.map((id, index) =>
        prisma.complaintFormField.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/admin/libro-reclamaciones");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error reordering fields:", error);
    return {
      success: false,
      error: "Error al reordenar campos",
    };
  }
}

// ==========================================
// GESTIÓN DE RECLAMACIONES
// ==========================================

export async function submitComplaint(data: {
  formData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    // Extraer datos principales
    const customerEmail = data.formData.email || data.formData.correo || null;
    const customerName =
      data.formData.nombre ||
      data.formData.name ||
      data.formData["nombre completo"] ||
      null;
    const customerPhone =
      data.formData.telefono || data.formData.phone || data.formData.celular || null;

    // Obtener configuración
    const config = await prisma.setting.findUnique({
      where: { key: "complaints_config" },
    });

    let complaintNumber = "REC-2025-001";

    if (config?.value) {
      const configData = config.value as {
        autoIncrement?: number;
        prefix?: string;
      };
      const prefix = configData.prefix || "REC";
      const counter = (configData.autoIncrement || 0) + 1;
      const year = new Date().getFullYear();
      complaintNumber = `${prefix}-${year}-${String(counter).padStart(3, "0")}`;

      // Actualizar contador
      await prisma.setting.update({
        where: { key: "complaints_config" },
        data: {
          value: {
            ...configData,
            autoIncrement: counter,
          },
        },
      });
    }

    // Crear reclamación
    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        formData: data.formData,
        customerEmail,
        customerName,
        customerPhone,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        status: "PENDING",
      },
    });

    // Enviar email de confirmación al cliente
    if (customerEmail) {
      const emailConfig = config?.value as {
        emailSubject?: string;
        emailMessage?: string;
      };

      await sendEmail({
        to: customerEmail,
        subject:
          emailConfig?.emailSubject ||
          `Reclamación Recibida - ${complaintNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reclamación Registrada</h2>
            <p>Estimado/a ${customerName || "cliente"},</p>
            <p>${
              emailConfig?.emailMessage ||
              "Hemos recibido su reclamación y será atendida a la brevedad."
            }</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Número de Reclamación:</strong> ${complaintNumber}</p>
              <p style="margin: 10px 0 0 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString(
                "es-PE"
              )}</p>
            </div>
            <p>Por favor conserve este número para dar seguimiento a su caso.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Este es un mensaje automático, por favor no responder.
            </p>
          </div>
        `,
      });
    }

    revalidatePath("/admin/libro-reclamaciones/reclamaciones");

    return {
      success: true,
      data: {
        complaintNumber: complaint.complaintNumber,
        id: complaint.id,
      },
    };
  } catch (error) {
    console.error("Error submitting complaint:", error);
    return {
      success: false,
      error: "Error al enviar reclamación",
    };
  }
}

export async function getComplaints(filters?: {
  status?: string;
  search?: string;
  limit?: number;
}) {
  try {
    const complaints = await prisma.complaint.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.search && {
          OR: [
            { complaintNumber: { contains: filters.search, mode: "insensitive" } },
            { customerName: { contains: filters.search, mode: "insensitive" } },
            { customerEmail: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 100,
    });

    return {
      success: true,
      data: complaints,
    };
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return {
      success: false,
      error: "Error al obtener reclamaciones",
      data: [],
    };
  }
}

export async function getComplaintById(id: string) {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      return {
        success: false,
        error: "Reclamación no encontrada",
      };
    }

    return {
      success: true,
      data: complaint,
    };
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return {
      success: false,
      error: "Error al obtener reclamación",
    };
  }
}

export async function updateComplaintStatus(
  id: string,
  status: string,
  adminResponse?: string,
  respondedBy?: string
) {
  try {
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: status as any,
        ...(adminResponse && {
          adminResponse,
          respondedAt: new Date(),
          respondedBy,
        }),
      },
    });

    // Si hay respuesta, enviar email al cliente
    if (adminResponse && complaint.customerEmail) {
      await sendEmail({
        to: complaint.customerEmail,
        subject: `Respuesta a su Reclamación - ${complaint.complaintNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Respuesta a su Reclamación</h2>
            <p>Estimado/a ${complaint.customerName || "cliente"},</p>
            <p>Le informamos que hemos actualizado el estado de su reclamación:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Número de Reclamación:</strong> ${
                complaint.complaintNumber
              }</p>
              <p style="margin: 10px 0;"><strong>Estado:</strong> ${status}</p>
              <p style="margin: 10px 0 0 0;"><strong>Respuesta:</strong></p>
              <p style="margin: 5px 0 0 0;">${adminResponse}</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Este es un mensaje automático, por favor no responder.
            </p>
          </div>
        `,
      });
    }

    revalidatePath("/admin/libro-reclamaciones/reclamaciones");

    return {
      success: true,
      data: complaint,
    };
  } catch (error) {
    console.error("Error updating complaint status:", error);
    return {
      success: false,
      error: "Error al actualizar estado",
    };
  }
}

// ==========================================
// CONFIGURACIÓN
// ==========================================

export async function getComplaintsConfig() {
  try {
    let config = await prisma.setting.findUnique({
      where: { key: "complaints_config" },
    });

    if (!config) {
      // Crear configuración por defecto
      config = await prisma.setting.create({
        data: {
          key: "complaints_config",
          value: {
            prefix: "REC",
            emailSubject: "Reclamación Recibida",
            emailMessage:
              "Hemos recibido su reclamación y será atendida a la brevedad. Nuestro equipo revisará su caso y se pondrá en contacto con usted en un plazo máximo de 15 días hábiles.",
            successMessage:
              "Su reclamación ha sido registrada exitosamente. Recibirá un email de confirmación con el número de reclamación para dar seguimiento a su caso.",
            requireEmail: true,
          },
          category: "complaints",
          description: "Configuración del sistema de reclamaciones",
        },
      });
    }

    return {
      success: true,
      data: config.value as {
        prefix: string;
        emailSubject: string;
        emailMessage: string;
        successMessage: string;
        requireEmail: boolean;
      },
    };
  } catch (error) {
    console.error("Error fetching complaints config:", error);
    return {
      success: false,
      error: "Error al obtener configuración",
    };
  }
}

export async function updateComplaintsConfig(data: {
  prefix: string;
  emailSubject: string;
  emailMessage: string;
  successMessage: string;
  requireEmail: boolean;
}) {
  try {
    // Validaciones
    if (!data.prefix || data.prefix.length < 2 || data.prefix.length > 10) {
      return {
        success: false,
        error: "El prefijo debe tener entre 2 y 10 caracteres",
      };
    }

    if (!/^[A-Z0-9]+$/.test(data.prefix)) {
      return {
        success: false,
        error: "El prefijo solo puede contener letras mayúsculas y números",
      };
    }

    if (!data.emailSubject || data.emailSubject.trim().length === 0) {
      return {
        success: false,
        error: "El asunto del email es obligatorio",
      };
    }

    if (!data.emailMessage || data.emailMessage.trim().length === 0) {
      return {
        success: false,
        error: "El mensaje del email es obligatorio",
      };
    }

    if (!data.successMessage || data.successMessage.trim().length === 0) {
      return {
        success: false,
        error: "El mensaje de éxito es obligatorio",
      };
    }

    const config = await prisma.setting.upsert({
      where: { key: "complaints_config" },
      update: {
        value: data,
        updatedAt: new Date(),
      },
      create: {
        key: "complaints_config",
        value: data,
        category: "complaints",
        description: "Configuración del sistema de reclamaciones",
      },
    });

    revalidatePath("/admin/libro-reclamaciones");

    return {
      success: true,
      message: "Configuración actualizada exitosamente",
      data: config.value,
    };
  } catch (error) {
    console.error("Error updating complaints config:", error);
    return {
      success: false,
      error: "Error al actualizar configuración",
    };
  }
}