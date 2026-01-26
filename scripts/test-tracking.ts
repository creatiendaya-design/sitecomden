import { trackConversion } from "../lib/conversion-api";

async function testTracking() {
  console.log("🧪 Probando Conversion APIs...\n");

  const result = await trackConversion("Purchase", {
    email: "test@example.com",
    phone: "987654321",
    firstName: "Juan",
    lastName: "Pérez",
    value: 299.90,
    currency: "PEN",
    transactionId: "TEST-" + Date.now(),
    items: [
      {
        id: "product-123",
        quantity: 1,
        item_price: 299.90,
      },
    ],
    sourceUrl: "https://shopgood.pe/test",
  });

  console.log("\n📊 Resultados:");
  console.log(JSON.stringify(result, null, 2));
}

testTracking();