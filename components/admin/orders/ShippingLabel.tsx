import { renderCode128 } from "@/lib/barcode/code128";
import type { LabelFormatId, ShippingLabelData } from "@/lib/orders/shipping-label";

interface ShippingLabelProps {
  data: ShippingLabelData;
  format: LabelFormatId;
}

function PartyBlock({
  title,
  name,
  phone,
  addressLines,
  reference,
  documentId,
  emphasis = false,
}: {
  title: string;
  name: string;
  phone: string;
  addressLines: string[];
  reference?: string;
  documentId?: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="label-eyebrow">{title}</p>
      <p className={emphasis ? "label-party-name-lg" : "label-party-name"}>{name}</p>
      {addressLines.map((line) => (
        <p key={line} className={emphasis ? "label-address-lg" : "label-address"}>
          {line}
        </p>
      ))}
      {reference && <p className="label-address">Ref: {reference}</p>}
      <p className="label-address">
        Tel: {phone}
        {documentId ? ` · DNI: ${documentId}` : ""}
      </p>
    </div>
  );
}

export default function ShippingLabel({ data, format }: ShippingLabelProps) {
  const barcode = renderCode128(data.orderNumber, {
    moduleWidth: 2,
    height: format === "thermal" ? 54 : 46,
  });

  return (
    <article className="label-sheet" data-format={format}>
      <header className="label-header">
        <div>
          <p className="label-eyebrow">Pedido</p>
          <p className="label-order-number">{data.orderNumber}</p>
        </div>
        <div className="label-header-meta">
          <p>{data.createdAtLabel}</p>
          <p>
            {data.totalUnits} {data.totalUnits === 1 ? "unidad" : "unidades"}
          </p>
        </div>
      </header>

      <section className="label-block">
        <PartyBlock title="Remitente" {...data.sender} />
      </section>

      <section className="label-block label-block-strong">
        <PartyBlock title="Destinatario" {...data.recipient} emphasis />
      </section>

      {(data.courier || data.trackingNumber) && (
        <section className="label-block label-row">
          {data.courier && (
            <div>
              <p className="label-eyebrow">Courier</p>
              <p className="label-party-name">{data.courier}</p>
            </div>
          )}
          {data.trackingNumber && (
            <div>
              <p className="label-eyebrow">Tracking</p>
              <p className="label-party-name label-mono">{data.trackingNumber}</p>
            </div>
          )}
        </section>
      )}

      {data.amountToCollect && (
        <section className="label-cod">
          <p className="label-cod-title">Contra entrega — cobrar</p>
          <p className="label-cod-amount">{data.amountToCollect}</p>
        </section>
      )}

      <section className="label-block label-items">
        <p className="label-eyebrow">Contenido</p>
        <ul>
          {data.items.map((item, index) => (
            <li key={`${item.sku ?? item.name}-${index}`}>
              <span className="label-qty">{item.quantity}×</span>
              <span>
                {item.name}
                {item.variantName ? ` — ${item.variantName}` : ""}
                {item.sku ? ` (${item.sku})` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {data.notes && (
        <section className="label-block label-notes">
          <p className="label-eyebrow">Notas del cliente</p>
          <p>{data.notes}</p>
        </section>
      )}

      {barcode && (
        <footer className="label-barcode">
          {/* SVG generado en el servidor a partir del número de pedido. */}
          <div dangerouslySetInnerHTML={{ __html: barcode.svg }} />
          <p className="label-mono">{data.orderNumber}</p>
        </footer>
      )}
    </article>
  );
}
