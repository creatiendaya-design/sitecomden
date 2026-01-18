import * as React from "react";

interface OrderDeliveredEmailProps {
  orderNumber: string;
  customerName: string;
  viewOrderLink: string;
  siteSettings?: {
    storeName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export default function OrderDeliveredEmail({
  orderNumber,
  customerName,
  viewOrderLink,
  siteSettings,
}: OrderDeliveredEmailProps) {
  const storeName = siteSettings?.storeName || "ShopGood Perú";
  const logoUrl = siteSettings?.logoUrl;
  const primaryColor = siteSettings?.primaryColor || "#10b981";
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
          .success-icon {
            font-size: 80px;
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
          .highlight {
            background: #d1fae5;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt={storeName} />
              <h1>¡Orden Entregada!</h1>
            </>
          ) : (
            <h1>{storeName} - ¡Orden Entregada!</h1>
          )}
        </div>

        <div className="content">
          <div className="success-icon">🎉</div>

          <p>Hola {customerName},</p>

          <p>
            <strong>¡Tu pedido ha sido entregado exitosamente!</strong>
          </p>

          <div className="order-number">
            Orden #{orderNumber}
          </div>

          <div className="highlight">
            <p style={{ margin: "0", fontSize: "16px" }}>
              Esperamos que disfrutes tu compra. Tu satisfacción es muy importante para nosotros.
            </p>
          </div>

          <p>
            Si tienes algún problema con tu pedido o no estás satisfecho con algún producto, 
            por favor contáctanos dentro de los próximos 7 días.
          </p>

          <div style={{ textAlign: "center" }}>
            <a href={viewOrderLink} className="button">
              Ver detalles de la orden
            </a>
          </div>

          <p style={{ marginTop: "30px", fontSize: "14px", color: "#666" }}>
            ¿Te gustó tu experiencia? Nos encantaría que dejes una reseña.
          </p>
        </div>

        <div className="footer">
          <p>© {currentYear} {storeName}. Todos los derechos reservados.</p>
          <p>Gracias por tu compra.</p>
        </div>
      </body>
    </html>
  );
}