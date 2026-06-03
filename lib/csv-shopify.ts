// lib/csv-shopify.ts
import Papa from "papaparse";
import type { IgvType } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

export interface ShopifyProductRow {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  Tags: string;
  Published: string;
  "Option1 Name": string;
  "Option1 Value": string;
  "Option2 Name": string;
  "Option2 Value": string;
  "Variant SKU": string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Variant Inventory Qty": string;
  "Variant Weight": string;
  "Variant Weight Unit": string;
  "Image Src": string;
  "Image Alt": string;
  "SEO Title": string;
  "SEO Description": string;
}

export const SHOPIFY_HEADERS: (keyof ShopifyProductRow)[] = [
  "Handle", "Title", "Body (HTML)", "Vendor", "Tags", "Published",
  "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
  "Variant SKU", "Variant Price", "Variant Compare At Price",
  "Variant Inventory Qty", "Variant Weight", "Variant Weight Unit",
  "Image Src", "Image Alt", "SEO Title", "SEO Description",
];

// Minimal shape of a Prisma Product row used for Shopify CSV export
interface PrismaProductForShopify {
  slug: string;
  name: string;
  description?: string | null;
  active?: boolean;
  basePrice: number | Decimal;
  compareAtPrice?: number | Decimal | null;
  weight?: number | Decimal | null;
  stock: number;
  sku?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  images?: unknown;
  hasVariants?: boolean;
  options?: Array<{ name: string }>;
  variants?: Array<{
    sku: string;
    price: number | Decimal;
    stock: number;
    compareAtPrice?: number | Decimal | null;
    options: Record<string, string> | unknown;
  }>;
}

interface ProductInputVariant {
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  options: Record<string, string>;
}

interface ProductInput {
  slug: string;
  name: string;
  description: string | null;
  shortDescription: null;
  basePrice: number;
  compareAtPrice: number | null;
  weight: number | null;
  stock: number;
  sku: string | null;
  active: boolean;
  featured: boolean;
  igvType: IgvType;
  metaTitle: string | null;
  metaDescription: string | null;
  categorySlug: null;
  imageUrls: string[];
  variants: ProductInputVariant[];
  _option1Name: string;
  _option2Name: string;
}

/** Convierte un producto Prisma a filas Shopify CSV */
export function productToShopifyRows(product: PrismaProductForShopify): ShopifyProductRow[] {
  const images: string[] = Array.isArray(product.images) ? (product.images as string[]) : [];
  const firstImage = images[0] ?? "";
  const options = product.options ?? [];

  const base: Partial<ShopifyProductRow> = {
    Handle: product.slug,
    Title: product.name,
    "Body (HTML)": product.description ?? "",
    Vendor: "",
    Tags: "",
    Published: product.active ? "TRUE" : "FALSE",
    "Image Src": firstImage,
    "Image Alt": product.name,
    "SEO Title": product.metaTitle ?? "",
    "SEO Description": product.metaDescription ?? "",
    "Variant Compare At Price": product.compareAtPrice ? String(Number(product.compareAtPrice)) : "",
    "Variant Weight": product.weight ? String(Number(product.weight)) : "",
    "Variant Weight Unit": product.weight ? "kg" : "",
  };

  if (!product.hasVariants || !product.variants?.length) {
    return [{
      ...base,
      "Option1 Name": "",
      "Option1 Value": "",
      "Option2 Name": "",
      "Option2 Value": "",
      "Variant SKU": product.sku ?? "",
      "Variant Price": String(Number(product.basePrice)),
      "Variant Inventory Qty": String(product.stock),
    } as ShopifyProductRow];
  }

  return product.variants.map((v) => {
    const variantOptions: Record<string, string> = (v.options as Record<string, string>) ?? {};
    const optionNames = options.map((o) => o.name);
    const optionValues = optionNames.map((name: string) => variantOptions[name] ?? "");

    return {
      ...base,
      "Option1 Name": optionNames[0] ?? "",
      "Option1 Value": optionValues[0] ?? "",
      "Option2 Name": optionNames[1] ?? "",
      "Option2 Value": optionValues[1] ?? "",
      "Variant SKU": v.sku,
      "Variant Price": String(Number(v.price)),
      "Variant Inventory Qty": String(v.stock),
    } as ShopifyProductRow;
  });
}

function generateVariantSku(handle: string, opt1: string, opt2: string): string {
  return [handle, opt1, opt2]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Agrupa filas Shopify por Handle y convierte a ProductInput */
export function shopifyRowsToProductInputs(rows: ShopifyProductRow[]): Map<string, ProductInput> {
  const byHandle = new Map<string, ProductInput>();

  for (const row of rows) {
    const handle = row.Handle;
    if (!handle) continue;

    // Shopify simple products always have Option1 Name="Title" + Option1 Value="Default Title"
    // These are NOT real variants — treat as simple product
    const isShopifyDefaultVariant =
      row["Option1 Name"]?.toLowerCase() === "title" &&
      row["Option1 Value"]?.toLowerCase() === "default title";

    if (!byHandle.has(handle)) {
      const firstStock = parseInt(row["Variant Inventory Qty"], 10);
      const compareAt = parseFloat(row["Variant Compare At Price"]);
      byHandle.set(handle, {
        slug: handle,
        name: row.Title,
        description: row["Body (HTML)"] || null,
        shortDescription: null,
        basePrice: (() => { const p = parseFloat(row["Variant Price"]); return Number.isFinite(p) ? p : 0; })(),
        // 0.00 means "no compare price" in Shopify — store as null
        compareAtPrice: Number.isFinite(compareAt) && compareAt > 0 ? compareAt : null,
        weight: row["Variant Weight"] ? parseFloat(row["Variant Weight"]) : null,
        stock: Number.isFinite(firstStock) ? firstStock : 0,
        sku: isShopifyDefaultVariant ? (row["Variant SKU"] || null) : null,
        active: row.Published?.toUpperCase() === "TRUE",
        featured: false,
        igvType: "GRAVADO" as IgvType,
        metaTitle: row["SEO Title"] || row.Title || null,
        metaDescription: row["SEO Description"] || null,
        categorySlug: null,
        imageUrls: row["Image Src"] ? [row["Image Src"]] : [],
        variants: [],
        _option1Name: row["Option1 Name"],
        _option2Name: row["Option2 Name"],
      });
    } else {
      // Collect additional images from subsequent rows for the same handle
      const product = byHandle.get(handle)!;
      if (row["Image Src"] && !product.imageUrls.includes(row["Image Src"])) {
        product.imageUrls.push(row["Image Src"]);
      }
    }

    // Skip "Default Title" rows — they represent simple products, not real variants
    if (isShopifyDefaultVariant) continue;

    // Push a variant for rows that have real option values or an explicit SKU
    const hasOptions = row["Option1 Value"] || row["Option2 Value"];
    const hasSku = row["Variant SKU"];

    if (hasSku || hasOptions) {
      const product = byHandle.get(handle)!;
      const options: Record<string, string> = {};
      if (product._option1Name && row["Option1 Value"]) options[product._option1Name] = row["Option1 Value"];
      if (product._option2Name && row["Option2 Value"]) options[product._option2Name] = row["Option2 Value"];

      const price = parseFloat(row["Variant Price"]);
      const compareAt = parseFloat(row["Variant Compare At Price"]);
      const stock = parseInt(row["Variant Inventory Qty"], 10);
      const sku = row["Variant SKU"] || generateVariantSku(handle, row["Option1 Value"], row["Option2 Value"]);

      product.variants.push({
        sku,
        price: Number.isFinite(price) ? price : product.basePrice,
        compareAtPrice: Number.isFinite(compareAt) && compareAt > 0 ? compareAt : null,
        stock: Number.isFinite(stock) ? stock : 0,
        options,
      });
    }
  }

  return byHandle;
}

/** Genera CSV Shopify en memoria */
export function generateShopifyCsv(products: PrismaProductForShopify[]): string {
  const rows: ShopifyProductRow[] = products.flatMap(productToShopifyRows);
  return Papa.unparse(rows, { columns: SHOPIFY_HEADERS });
}

/** Valida una fila Shopify. Retorna null si es válida */
export function validateShopifyRow(row: ShopifyProductRow, rowIndex: number): string | null {
  if (!row.Handle) return `Fila ${rowIndex + 1}: falta 'Handle'`;
  if (!row.Title && rowIndex === 0) return `Fila ${rowIndex + 1}: falta 'Title'`;
  return null;
}
