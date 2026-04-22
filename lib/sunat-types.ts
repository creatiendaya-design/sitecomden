import type { Order, ElectronicDocument, DocumentType } from "@prisma/client";

export type { DocumentType };

export type DocStatus = "PENDING" | "ISSUED" | "CANCELLED" | "ERROR";

export interface NubefactItem {
  unidad_de_medida: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  subtotal: number;
  tipo_de_igv: 1 | 2 | 3;
  igv: number;
  total: number;
}

export interface NubefactPayload {
  operacion: "generar_comprobante";
  tipo_de_comprobante: 1 | 2;
  serie: string;
  numero: number;
  sunat_transaction: 1;
  cliente_tipo_de_documento: 0 | 1 | 6;
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion: string;
  cliente_email: string;
  fecha_de_emision: string;
  moneda: 1;
  porcentaje_de_igv: 18.0;
  total_gravada: number;
  total_inafecta: number;
  total_exonerada: number;
  total_igv: number;
  total: number;
  enviar_automaticamente_a_la_sunat: true;
  enviar_automaticamente_al_cliente: false;
  items: NubefactItem[];
}

export interface NubefactResponse {
  enlace_del_pdf: string;
  enlace_del_xml: string;
  enlace_del_cdr: string;
  serie: string;
  numero: number;
  aceptada_por_sunat: boolean;
  sunat_description: string;
  codigo_hash: string;
  codigo: number;
  errors: string[];
  sunat_responsecode: string;
}

export interface SunatConfig {
  enabled: boolean;
  emissionMode: "auto" | "manual" | "mixed";
  apiKey: string;
  apiUrl: string;
  ruc: string;
  razonSocial: string;
  address: string;
  boletaSeries: string;
  facturaSeries: string;
  pricesIncludeIgv: boolean;
}

export interface SunatProvider {
  emitDocument(
    order: Order & { items: Array<{ name: string; quantity: number; price: number; sku: string | null; productId: string | null }> },
    type: DocumentType,
    config: SunatConfig
  ): Promise<ElectronicDocument>;
  cancelDocument(documentId: string, reason: string, config: SunatConfig): Promise<void>;
  resendEmail(documentId: string, email: string, config: SunatConfig): Promise<void>;
}
