import type { NubefactItem } from "./sunat-types";

type IgvType = "GRAVADO" | "EXONERADO" | "INAFECTO";

interface ItemInput {
  description: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  igvType: IgvType;
  pricesIncludeIgv: boolean;
}

const IGV_RATE = 0.18;

export function buildNubefactItem(item: ItemInput): NubefactItem {
  const { description, sku, quantity, unitPrice, igvType, pricesIncludeIgv } = item;

  let baseUnitPrice: number;
  let igvUnitAmount: number;
  let finalUnitPrice: number;

  if (igvType === "GRAVADO") {
    if (pricesIncludeIgv) {
      baseUnitPrice = round(unitPrice / (1 + IGV_RATE));
      igvUnitAmount = round(unitPrice - baseUnitPrice);
      finalUnitPrice = unitPrice;
    } else {
      baseUnitPrice = unitPrice;
      igvUnitAmount = round(unitPrice * IGV_RATE);
      finalUnitPrice = round(unitPrice + igvUnitAmount);
    }
  } else {
    baseUnitPrice = unitPrice;
    igvUnitAmount = 0;
    finalUnitPrice = unitPrice;
  }

  const subtotal = round(baseUnitPrice * quantity);
  const totalIgv = round(igvUnitAmount * quantity);
  const total = round(finalUnitPrice * quantity);

  return {
    unidad_de_medida: "NIU",
    codigo: sku ?? "GEN",
    descripcion: description,
    cantidad: quantity,
    valor_unitario: baseUnitPrice,
    precio_unitario: finalUnitPrice,
    subtotal,
    tipo_de_igv: igvType === "GRAVADO" ? 1 : igvType === "EXONERADO" ? 2 : 3,
    igv: totalIgv,
    total,
  };
}

export function buildTotals(items: NubefactItem[]): {
  totalGravada: number;
  totalInafecta: number;
  totalExonerada: number;
  totalIgv: number;
  total: number;
} {
  let totalGravada = 0;
  let totalInafecta = 0;
  let totalExonerada = 0;
  let totalIgv = 0;

  for (const item of items) {
    if (item.tipo_de_igv === 1) totalGravada += item.subtotal;
    else if (item.tipo_de_igv === 2) totalExonerada += item.subtotal;
    else totalInafecta += item.subtotal;
    totalIgv += item.igv;
  }

  return {
    totalGravada: round(totalGravada),
    totalInafecta: round(totalInafecta),
    totalExonerada: round(totalExonerada),
    totalIgv: round(totalIgv),
    total: round(totalGravada + totalInafecta + totalExonerada + totalIgv),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
