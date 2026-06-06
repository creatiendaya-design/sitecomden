import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateReferralCode, isPlaceholderEmail } from "./core";

interface LinkCustomerInput {
  email: string;
  name: string;
  phone?: string | null;
  /**
   * El DNI NO se persiste al auto-crear la ficha: `Customer.dni` es @unique y un
   * comprador invitado podría repetir un DNI ya usado por otra cuenta, lo que
   * lanzaría una violación de unicidad y abortaría el checkout. El admin puede
   * completarlo después desde /admin/clientes.
   */
}

/**
 * Find-or-create de un `Customer` por email, replicando el modelo de Shopify:
 * cualquier comprador (con cuenta o invitado) obtiene una ficha en el CRM.
 *
 * Devuelve el id del cliente, o `null` cuando no corresponde crear ficha (email
 * vacío / placeholder COD) o ante un fallo transitorio. NUNCA lanza: enlazar el
 * CRM jamás debe tumbar la creación de la orden ni la confirmación del pago.
 *
 * No otorga bono de bienvenida — ese es exclusivo del registro explícito vía
 * Clerk (`registerCustomer`). Aquí solo materializamos la ficha.
 *
 * Acepta un cliente de transacción para enlazar atómicamente con `order.create`.
 */
export async function ensureCustomerId(
  input: LinkCustomerInput,
  db: Prisma.TransactionClient = prisma
): Promise<string | null> {
  const email = input.email?.trim().toLowerCase();
  if (isPlaceholderEmail(email)) return null;

  try {
    const existing = await db.customer.findUnique({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing) {
      // Si fue soft-deleted y vuelve a comprar, lo "resucitamos" para que
      // reaparezca en el CRM (coherente con "todos los compradores aparecen").
      if (existing.deletedAt) {
        await db.customer.update({
          where: { id: existing.id },
          data: { deletedAt: null },
        });
      }
      return existing.id;
    }

    // Generar un referralCode único (reintenta ante la rara colisión).
    let referralCode = generateReferralCode(input.name);
    for (let attempt = 0; attempt < 10; attempt++) {
      const clash = await db.customer.findUnique({
        where: { referralCode },
        select: { id: true },
      });
      if (!clash) break;
      referralCode = generateReferralCode(input.name + attempt);
    }

    const created = await db.customer.create({
      data: {
        email,
        name: input.name,
        phone: input.phone?.trim() || null,
        referralCode,
        loyaltyTier: "BRONZE",
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    // Una carrera puede crear el mismo email en paralelo (unique violation):
    // recuperar la ficha existente en vez de fallar.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const found = await db.customer
        .findUnique({ where: { email }, select: { id: true } })
        .catch(() => null);
      if (found) return found.id;
    }
    console.error("ensureCustomerId failed:", error);
    return null;
  }
}
