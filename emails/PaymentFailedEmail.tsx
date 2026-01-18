import * as React from "react";

interface PaymentFailedEmailProps {
  orderNumber: string;
  customerName: string;
  total: number;
  failureReason?: string;
  viewOrderLink: string;
  siteSettings?: {
    storeName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export default function PaymentFailedEmail({
  orderNumber,
  customerName,
  total,
  failureReason,
  viewOrderLink,
  siteSettings,
}: PaymentFailedEmailProps) {
  const storeName = siteSettings?.storeName || "ShopGood Perú";
  const logoUrl = siteSettings?.logoUrl;
  const primaryColor = siteSettings?.primaryColor || "#f59e0b";
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
          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt={storeName} />
              <h1>Problema con el Pago</h1>
            </>
          ) : (
            <h1>{storeName} - Problema con el Pago</h1>
          )}
        </div>

        <div className="content">
          <div className="icon">⚠️</div>

          <p>Hola {customerName},</p>

          <p>
            Lamentablemente, no pudimos procesar el pago de tu orden.
          </p>

          <div className="order-number">
            Orden #{orderNumber}
          </div>

          <div className="warning-box">
            <p style={{ margin: "0", fontWeight: "bold" }}>Monto: S/ {total.toFixed(2)}</p>
            {failureReason && (
              <p style={{ margin: "10px 0 0 0", fontSize: "14px" }}>
                Motivo: {failureReason}
              </p>
            )}
          </div>

          <p>
            <strong>¿Qué puedes hacer?</strong>
          </p>
          <ul style={{ lineHeight: "1.8" }}>
            <li>Verifica que tu tarjeta tenga fondos suficientes</li>
            <li>Confirma que los datos de pago sean correctos</li>
            <li>Intenta con otro método de pago</li>
            <li>Contacta a tu banco si el problema persiste</li>
          </ul>

          <div style={{ textAlign: "center" }}>
            <a href={viewOrderLink} className="button">
              Reintentar Pago
            </a>
          </div>

          <p style={{ marginTop: "30px", fontSize: "14px", color: "#666" }}>
            Si necesitas ayuda, no dudes en contactarnos. Estamos aquí para ayudarte.
          </p>
        </div>

        <div className="footer">
          <p>© {currentYear} {storeName}. Todos los derechos reservados.</p>
        </div>
      </body>
    </html>
  );
}