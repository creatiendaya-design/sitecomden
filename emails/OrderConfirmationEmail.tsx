import * as React from "react";

interface OrderConfirmationEmailProps {
  orderNumber: string;
  customerName: string;
  total: number;
  items: Array<{
    name: string;
    variantName?: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    address: string;
    district: string;
    city: string;
    department: string;
  };
  paymentMethod: string;
  viewOrderLink: string;  // ✅ Link ya construido
  siteSettings?: {
    storeName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export default function OrderConfirmationEmail({
  orderNumber,
  customerName,
  total,
  items,
  shippingAddress,
  paymentMethod,
  viewOrderLink,  // ✅ Recibimos el link completo
  siteSettings,
}: OrderConfirmationEmailProps) {
  const storeName = siteSettings?.storeName || "ShopGood Perú";
  const logoUrl = siteSettings?.logoUrl;
  const primaryColor = siteSettings?.primaryColor || "#000";
  const currentYear = new Date().getFullYear();

  return (
    <html>
      <head>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: ${primaryColor};
            color: #fff;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header img {
            max-width: 200px;
            max-height: 60px;
            object-fit: contain;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .order-number {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin: 20px 0;
          }
          .item {
            border-bottom: 1px solid #e0e0e0;
            padding: 15px 0;
          }
          .item:last-child {
            border-bottom: none;
          }
          .total {
            font-size: 20px;
            font-weight: bold;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid ${primaryColor};
          }
          .button-order {
            display: inline-block;
            background: ${primaryColor};
            color: #fff;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
          }
          .section {
            margin: 20px 0;
            padding: 15px;
            background: white;
            border-radius: 6px;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} />
          ) : (
            <h1>{storeName}</h1>
          )}
        </div>

        <div className="content">
          <p>Hola {customerName},</p>
          <p>
            ¡Gracias por tu compra! Hemos recibido tu orden y la estamos procesando.
          </p>

          <div className="order-number">
            Orden #{orderNumber}
          </div>

          <div className="section">
            <h3>Resumen de tu pedido</h3>
            {items.map((item, index) => (
              <div key={index} className="item">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{item.name}</strong>
                    {item.variantName && (
                      <div style={{ fontSize: "14px", color: "#666" }}>
                        {item.variantName}
                      </div>
                    )}
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      Cantidad: {item.quantity}
                    </div>
                  </div>
                  <div>
                    <strong>S/ {item.price.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}

            <div className="total">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Total:</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Dirección de envío</h3>
            <p>
              {shippingAddress.address}<br />
              {shippingAddress.district}, {shippingAddress.city}<br />
              {shippingAddress.department}
            </p>
          </div>

          <div className="section">
            <h3>Método de pago</h3>
            <p>
              {paymentMethod === "YAPE" && "Yape"}
              {paymentMethod === "PLIN" && "Plin"}
              {paymentMethod === "CARD" && "Tarjeta de crédito/débito"}
              {paymentMethod === "PAYPAL" && "PayPal"}
              {paymentMethod === "MERCADOPAGO" && "Mercado Pago"}
            </p>
            {(paymentMethod === "YAPE" || paymentMethod === "PLIN") && (
              <p style={{ color: "#f59e0b", fontSize: "14px" }}>
                ⚠️ Tu pago está pendiente de verificación. Te notificaremos cuando sea confirmado.
              </p>
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <a href={viewOrderLink} style={{background: `${primaryColor}`, color:'white'}} className="button-order">
              Ver estado de orden
            </a>
          </div>

          <p style={{ marginTop: "30px", fontSize: "14px", color: "#666" }}>
            Si tienes alguna pregunta sobre tu orden, no dudes en contactarnos.
          </p>
        </div>

        <div className="footer">
          <p>© {currentYear} {storeName}. Todos los derechos reservados.</p>
          <p>Este es un email automático, por favor no respondas a este mensaje.</p>
        </div>
      </body>
    </html>
  );
}