import { LABEL_FORMATS, type LabelFormatId } from "@/lib/orders/shipping-label";

/**
 * CSS de la hoja de etiqueta. Va inline en la página (no en Tailwind) porque
 * `@page` necesita el tamaño físico exacto y éste cambia según el formato
 * elegido, algo que las utilidades de Tailwind no pueden expresar.
 */
export function getLabelStyles(format: LabelFormatId): string {
  const isThermal = format === LABEL_FORMATS.THERMAL.id;
  const pageSize = isThermal ? LABEL_FORMATS.THERMAL.css : LABEL_FORMATS.A4_HALF.css;
  const pageMargin = isThermal ? "4mm" : "12mm";
  const sheetWidth = isThermal ? "92mm" : "186mm";

  return `
@page { size: ${pageSize}; margin: ${pageMargin}; }

.label-sheet {
  width: ${sheetWidth};
  margin: 0 auto;
  padding: 4mm;
  border: 1.5px solid #000;
  border-radius: 2mm;
  background: #fff;
  color: #000;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif;
  font-size: ${isThermal ? "10.5pt" : "11pt"};
  line-height: 1.3;
}

.label-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4mm;
  padding-bottom: 2mm;
  border-bottom: 1.5px solid #000;
}

.label-order-number {
  font-size: ${isThermal ? "18pt" : "20pt"};
  font-weight: 800;
  letter-spacing: 0.5px;
}

.label-header-meta {
  text-align: right;
  font-size: 8.5pt;
}

.label-eyebrow {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #444;
}

.label-block {
  padding: 2mm 0;
  border-bottom: 1px dashed #999;
}

.label-block-strong {
  border-bottom: 1.5px solid #000;
}

.label-row {
  display: flex;
  gap: 8mm;
}

.label-party-name { font-weight: 700; }
.label-party-name-lg {
  font-size: ${isThermal ? "14pt" : "15pt"};
  font-weight: 800;
}
.label-address { font-size: ${isThermal ? "9.5pt" : "10pt"}; }
.label-address-lg { font-size: ${isThermal ? "11pt" : "12pt"}; }
.label-mono { font-family: ui-monospace, "Courier New", monospace; }

.label-cod {
  margin: 2mm 0;
  padding: 2mm 3mm;
  border: 2px solid #000;
  border-radius: 1.5mm;
  background: #000;
  color: #fff;
  text-align: center;
}
.label-cod-title {
  font-size: 8.5pt;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.label-cod-amount {
  font-size: ${isThermal ? "20pt" : "22pt"};
  font-weight: 800;
}

.label-items ul { margin-top: 1mm; }
.label-items li {
  display: flex;
  gap: 2mm;
  font-size: ${isThermal ? "9pt" : "9.5pt"};
  padding: 0.4mm 0;
}
.label-qty { font-weight: 700; }

.label-notes p:last-child { font-size: 9pt; }

.label-barcode {
  padding-top: 2mm;
  text-align: center;
}
.label-barcode svg {
  width: 100%;
  max-width: ${isThermal ? "80mm" : "110mm"};
  height: ${isThermal ? "16mm" : "14mm"};
}
.label-barcode p {
  font-size: 9pt;
  letter-spacing: 2px;
}

@media print {
  .no-print { display: none !important; }
  .label-screen { padding: 0 !important; background: #fff !important; }
  .label-sheet {
    border: none;
    padding: 0;
    page-break-inside: avoid;
  }
  .label-cod {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;
}
