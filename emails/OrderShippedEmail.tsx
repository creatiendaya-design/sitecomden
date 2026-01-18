import * as React from "react";

interface OrderShippedEmailProps {
  orderNumber: string;
  customerName: string;
  trackingNumber?: string;
  shippingCourier?: string;
  estimatedDelivery?: string;
  viewOrderLink: string;  // ✅ Link con token
  siteSettings?: {
    storeName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export default function OrderShippedEmail({
  orderNumber,
  customerName,
  trackingNumber,
  shippingCourier,
  estimatedDelivery,
  viewOrderLink,
  siteSettings,
}: OrderShippedEmailProps) {
  const storeName = siteSettings?.storeName || "ShopGood Perú";
  const logoUrl = siteSettings?.logoUrl;
  const primaryColor = siteSettings?.primaryColor || "#3b82f6";
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
            margin: 10px 0 0 0;
            font-size: 24px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .icon {
            font-size: 60px;
            text-align: center;
            margin: 20px 0;
          }
          .order-number {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            text-align: center;
            margin: 20px 0;
          }
          .tracking-box {
            background: #dbeafe;
            border: 2px solid ${primaryColor};
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .tracking-number {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin: 10px 0;
            letter-spacing: 2px;
          }
          .button {
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
          .info-box {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt={storeName} />
              <h1>¡Tu Orden Está en Camino!</h1>
            </>
          ) : (
            <h1>{storeName} - ¡Tu Orden Está en Camino!</h1>
          )}
        </div>

        <div className="content">
          <div className="icon">📦</div>

          <p>Hola {customerName},</p>

          <p>
            ¡Buenas noticias! Tu pedido ha sido enviado y está en camino a tu dirección.
          </p>

          <div className="order-number">
            Orden #{orderNumber}
          </div>

          {trackingNumber && (
            <div className="tracking-box">
              <p style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "bold" }}>
                NÚMERO DE TRACKING
              </p>
              <div className="tracking-number">{trackingNumber}</div>
              {shippingCourier && (
                <p style={{ margin: "10px 0 0 0", fontSize: "14px", color: "#1e40af" }}>
                  Courier: {shippingCourier}
                </p>
              )}
            </div>
          )}

          {estimatedDelivery && (
            <div className="info-box">
              <p style={{ margin: "0" }}>
                <strong>Fecha estimada de entrega:</strong><br />
                {new Date(estimatedDelivery).toLocaleDateString("es-PE", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}

          <p style={{ marginTop: "20px" }}>
            Puedes rastrear tu paquete usando el número de tracking en el sitio web 
            del courier {shippingCourier ? `(${shippingCourier})` : ""}.
          </p>

          <div style={{ textAlign: "center" }}>
            <a href={viewOrderLink} className="button">
              Ver detalles de la orden
            </a>
          </div>

          <p style={{ marginTop: "30px", fontSize: "14px", color: "#666" }}>
            Si tienes alguna pregunta sobre tu envío, no dudes en contactarnos.
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