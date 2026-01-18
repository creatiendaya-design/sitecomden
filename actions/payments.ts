"use server";


export async function processCardPayment(data: {
  orderId: string;
  culqiToken: string;
  email: string;
}) {
  return {
    success: false,
    error: "Culqi no está configurado aún",
  };
}