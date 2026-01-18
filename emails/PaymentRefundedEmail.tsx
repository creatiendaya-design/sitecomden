import * as React from "react";

interface PaymentRefundedEmailProps {
  orderNumber: string;
  customerName: string;
  refundAmount: number;
  refundReason?: string;
  viewOrderLink: string;
  siteSettings?: {
    storeName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export default function PaymentRefundedEmail({
  orderNumber,
  customerName,
  refundAmount,
  refundReason,
  viewOrderLink,
  siteSettings,
}: PaymentRefundedEmailProps) {
  const storeName = siteSettings?.storeName || "ShopGood Perú";
  const logoUrl = siteSettings?.logoUrl;
  const primaryColor = siteSettings?.primaryColor || "#6366f1";
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
          .highlight {
            background: #e0e7ff;
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
              <h1>Reembolso Procesado</h1>
            </>
          ) : (
            <h1>{storeName} - Reembolso Procesado</h1>
          )}
        </div>

        <div className="content">
          <div className="icon">💰</div>

          <p>Hola {customerName},</p>

          <p>
            Te informamos que hemos procesado el reembolso de tu orden.
          </p>

          <div className="order-number">
            Orden #{orderNumber}
          </div>

          <div className="highlight">
            <p style={{ margin: "0", fontSize: "18px" }}>
              Monto reembolsado: <strong>S/ {refundAmount.toFixed(2)}</strong>
            </p>
          </div>

          {refundReason && (
            <p style={{ background: "#f3f4f6", padding: "15px", borderRadius: "6px" }}>
              <strong>Motivo:</strong> {refundReason}
            </p>
          )}

          <p>
            El reembolso será acreditado en los próximos <strong>5-7 días hábiles</strong>, 
            dependiendo de tu banco o método de pago original.
          </p>

          <div style={{ textAlign: "center" }}>
            <a href={viewOrderLink} className="button">
              Ver detalles de la orden
            </a>
          </div>

          <p style={{ marginTop: "30px", fontSize: "14px", color: "#666" }}>
            Lamentamos los inconvenientes. Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>

        <div className="footer">
          <p>© {currentYear} {storeName}. Todos los derechos reservados.</p>
        </div>
      </body>
    </html>
  );
}