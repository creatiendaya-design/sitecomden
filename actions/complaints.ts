"use server";

import { ComplaintStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { FormField, ComplaintsConfig } from "@/types/complaints";
import { prismaFieldToFormField } from "@/lib/complaints-helpers";
import { escapeHtml } from "@/lib/sanitize";
import { protectRoute } from "@/lib/protect-route";
import { z } from "zod";
import {
  complaintFormFieldSchema,
  submitComplaintSchema,
  updateComplaintFormFieldSchema,
} from "@/lib/validations/admin";
import { logAudit } from "@/lib/audit-log";

function flattenZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join("; ");
}

// ==========================================
// TIPOS DE RETORNO
// ==========================================

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; data?: T };

// ==========================================
// GESTIÓN DE CAMPOS DEL FORMULARIO
// ==========================================

export async function getFormFields(): Promise<ActionResult<FormField[]>> {
  try {
    const fields = await prisma.complaintFormField.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    // ⭐ CONVERSIÓN DE TIPOS PRISMA → FORMFIELD ⭐
    const formFields = fields.map(prismaFieldToFormField);

    return {
      success: true,
      data: formFields,
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

export async function getAllFormFields(): Promise<ActionResult<FormField[]>> {
  try {
    await protectRoute("complaints:configure");
    const fields = await prisma.complaintFormField.findMany({
      orderBy: { order: "asc" },
    });

    // ⭐ CONVERSIÓN DE TIPOS PRISMA → FORMFIELD ⭐
    const formFields = fields.map(prismaFieldToFormField);

    return {
      success: true,
      data: formFields,
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
  options?: string[];
  otherLabel?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}) {
  try {
    const userId = await protectRoute("complaints:configure");

    const parsed = complaintFormFieldSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const input = parsed.data;

    // Obtener el último order
    const lastField = await prisma.complaintFormField.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (lastField?.order || 0) + 1;

    const field = await prisma.complaintFormField.create({
      data: {
        label: input.label,
        fieldType: input.fieldType,
        section: input.section,
        width: input.width || "full",
        placeholder: input.placeholder,
        helpText: input.helpText,
        required: input.required,
        // ✅ Conversión explícita: array con elementos o undefined
        options: input.options && input.options.length > 0 ? input.options : undefined,
        otherLabel: input.otherLabel,
        minLength: input.minLength,
        maxLength: input.maxLength,
        pattern: input.pattern,
        order: nextOrder,
        active: true,
      },
    });

    revalidatePath("/admin/libro-reclamaciones");

    await logAudit({
      action: "complaint.form_field_created",
      userId,
      entityType: "ComplaintFormField",
      entityId: field.id,
      after: { label: field.label, fieldType: field.fieldType },
    });

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
    options?: string[];
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    active?: boolean;
  }
) {
  try {
    const userId = await protectRoute("complaints:configure");

    const parsed = updateComplaintFormFieldSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const input = parsed.data;

    const updateData: Record<string, unknown> = {};

    if (input.label !== undefined) updateData.label = input.label;
    if (input.fieldType !== undefined) updateData.fieldType = input.fieldType;
    if (input.placeholder !== undefined) updateData.placeholder = input.placeholder;
    if (input.helpText !== undefined) updateData.helpText = input.helpText;
    if (input.required !== undefined) updateData.required = input.required;
    if (input.minLength !== undefined) updateData.minLength = input.minLength;
    if (input.maxLength !== undefined) updateData.maxLength = input.maxLength;
    if (input.pattern !== undefined) updateData.pattern = input.pattern;
    if (input.active !== undefined) updateData.active = input.active;

    // ✅ Manejo especial para options
    if (input.options !== undefined) {
      updateData.options =
        input.options && input.options.length > 0 ? input.options : undefined;
    }

    const field = await prisma.complaintFormField.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/admin/libro-reclamaciones");

    await logAudit({
      action: "complaint.form_field_updated",
      userId,
      entityType: "ComplaintFormField",
      entityId: id,
      after: updateData,
    });

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
    await protectRoute("complaints:configure");
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
    await protectRoute("complaints:configure");
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
  formData: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    // Public endpoint — validate everything strictly.
    const parsed = submitComplaintSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const input = parsed.data;
    const formData = input.formData as Record<string, unknown>;

    // Extraer datos principales
    const pickString = (k: string): string | null => {
      const v = formData[k];
      return typeof v === "string" ? v : null;
    };
    const customerEmail =
      pickString("email") ?? pickString("correo");
    const customerName =
      pickString("nombre") ??
      pickString("name") ??
      pickString("nombre completo");
    const customerPhone =
      pickString("telefono") ??
      pickString("phone") ??
      pickString("celular");

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
        // Zod typed it as Record<string, unknown>; Prisma's InputJsonValue
        // accepts arbitrary JSON-serializable values, but TS can't narrow.
        formData: input.formData as object,
        customerEmail,
        customerName,
        customerPhone,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
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
            <p>Estimado/a ${escapeHtml(customerName) || "cliente"},</p>
            <p>${escapeHtml(
              emailConfig?.emailMessage ||
              "Hemos recibido su reclamación y será atendida a la brevedad."
            )}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Número de Reclamación:</strong> ${escapeHtml(complaintNumber)}</p>
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
    await protectRoute("complaints:view");
    const complaints = await prisma.complaint.findMany({
      where: {
        ...(filters?.status && { status: filters.status as ComplaintStatus }),
        ...(filters?.search && {
          OR: [
            { complaintNumber: { contains: filters.search, mode: "insensitive" } },
            { customerName: { contains: filters.search, mode: "insensitive" } },
            { customerEmail: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(filters?.limit ?? 50, 100),
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
    await protectRoute("complaints:view");
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
    // El responsable es siempre el admin autenticado, no un valor del cliente.
    const userId = await protectRoute("complaints:respond");
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: status as ComplaintStatus,
        ...(adminResponse && {
          adminResponse,
          respondedAt: new Date(),
          respondedBy: respondedBy ?? userId,
        }),
      },
    });

    await logAudit({
      action: "complaint.status_updated",
      userId,
      entityType: "Complaint",
      entityId: complaint.id,
      after: { status, responded: Boolean(adminResponse) },
    });

    // Si hay respuesta, enviar email al cliente
    if (adminResponse && complaint.customerEmail) {
      await sendEmail({
        to: complaint.customerEmail,
        subject: `Respuesta a su Reclamación - ${complaint.complaintNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Respuesta a su Reclamación</h2>
            <p>Estimado/a ${escapeHtml(complaint.customerName) || "cliente"},</p>
            <p>Le informamos que hemos actualizado el estado de su reclamación:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Número de Reclamación:</strong> ${escapeHtml(complaint.complaintNumber)}</p>
              <p style="margin: 10px 0;"><strong>Estado:</strong> ${escapeHtml(status)}</p>
              <p style="margin: 10px 0 0 0;"><strong>Respuesta:</strong></p>
              <p style="margin: 5px 0 0 0;">${escapeHtml(adminResponse)}</p>
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

export async function getComplaintsConfig(): Promise<ActionResult<ComplaintsConfig>> {
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
      data: config.value as ComplaintsConfig,
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
    await protectRoute("complaints:configure");
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