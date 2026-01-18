import * as React from "react";

interface OrderCancelledEmailProps {
  orderNumber: string;
  customerName: string;
  cancellationReason?: string;
  viewOrderLink: string;
  siteSettings?: {
    storeName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

export default function OrderCancelledEmail({
  orderNumber,
  customerName,
  cancellationReason,
  viewOrderLink,
  siteSettings,
}: OrderCancelledEmailProps) {
  const storeName = siteSettings?.storeName || "ShopGood Perú";
  const logoUrl = siteSettings?.logoUrl;
  const primaryColor = siteSettings?.primaryColor || "#ef4444";
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
          .info-box {
            background: #fee2e2;
            border-left: 4px solid #ef4444;
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
              <h1>Orden Cancelada</h1>
            </>
          ) : (
            <h1>{storeName} - Orden Cancelada</h1>
          )}
        </div>

        <div className="content">
          <div className="icon">❌</div>

          <p>Hola {customerName},</p>

          <p>
            Te informamos que tu orden ha sido cancelada.
          </p>

          <div className="order-number">
            Orden #{orderNumber}
          </div>

          {cancellationReason && (
            <div className="info-box">
              <p style={{ margin: "0", fontWeight: "bold" }}>Motivo de cancelación:</p>
              <p style={{ margin: "5px 0 0 0" }}>{cancellationReason}</p>
            </div>
          )}

          <p>
            Si realizaste algún pago, el reembolso será procesado en los próximos 5-7 días hábiles 
            dependiendo de tu método de pago.
          </p>

          <div style={{ textAlign: "center" }}>
            <a href={viewOrderLink} className="button">
              Ver detalles de la orden
            </a>
          </div>

          <p style={{ marginTop: "30px", fontSize: "14px", color: "#666" }}>
            Si tienes alguna pregunta sobre esta cancelación, no dudes en contactarnos.
          </p>
        </div>

        <div className="footer">
          <p>© {currentYear} {storeName}. Todos los derechos reservados.</p>
          <p>Esperamos verte de nuevo pronto.</p>
        </div>
      </body>
    </html>
  );
}