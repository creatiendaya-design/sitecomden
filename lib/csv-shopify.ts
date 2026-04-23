// lib/csv-shopify.ts
import Papa from "papaparse";

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

/** Convierte un producto Prisma a filas Shopify CSV */
export function productToShopifyRows(product: any): ShopifyProductRow[] {
  const images: string[] = Array.isArray(product.images) ? product.images : [];
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
    "Variant Compare At Price": product.compareAtPrice ? String(product.compareAtPrice) : "",
    "Variant Weight": product.weight ? String(product.weight) : "",
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
      "Variant Price": String(product.basePrice),
      "Variant Inventory Qty": String(product.stock),
    } as ShopifyProductRow];
  }

  return product.variants.map((v: any) => {
    const variantOptions = v.options as Record<string, string> ?? {};
    const optionNames = options.map((o: any) => o.name);
    const optionValues = optionNames.map((name: string) => variantOptions[name] ?? "");

    return {
      ...base,
      "Option1 Name": optionNames[0] ?? "",
      "Option1 Value": optionValues[0] ?? "",
      "Option2 Name": optionNames[1] ?? "",
      "Option2 Value": optionValues[1] ?? "",
      "Variant SKU": v.sku,
      "Variant Price": String(v.price),
      "Variant Inventory Qty": String(v.stock),
    } as ShopifyProductRow;
  });
}

/** Agrupa filas Shopify por Handle y convierte a ProductInput */
export function shopifyRowsToProductInputs(rows: ShopifyProductRow[]): Map<string, any> {
  const byHandle = new Map<string, any>();

  for (const row of rows) {
    const handle = row.Handle;
    if (!handle) continue;

    if (!byHandle.has(handle)) {
      byHandle.set(handle, {
        slug: handle,
        name: row.Title,
        description: row["Body (HTML)"] || null,
        shortDescription: null,
        basePrice: parseFloat(row["Variant Price"]) || 0,
        compareAtPrice: row["Variant Compare At Price"] ? parseFloat(row["Variant Compare At Price"]) : null,
        weight: row["Variant Weight"] ? parseFloat(row["Variant Weight"]) : null,
        active: row.Published?.toUpperCase() === "TRUE",
        featured: false,
        igvType: "GRAVADO" as any,
        metaTitle: row["SEO Title"] || null,
        metaDescription: row["SEO Description"] || null,
        categorySlug: null,
        imageUrl: row["Image Src"] || null,
        variants: [] as any[],
        _option1Name: row["Option1 Name"],
        _option2Name: row["Option2 Name"],
      });
    }

    if (row["Variant SKU"]) {
      const product = byHandle.get(handle);
      const options: Record<string, string> = {};
      if (product._option1Name && row["Option1 Value"]) options[product._option1Name] = row["Option1 Value"];
      if (product._option2Name && row["Option2 Value"]) options[product._option2Name] = row["Option2 Value"];

      product.variants.push({
        sku: row["Variant SKU"],
        price: parseFloat(row["Variant Price"]) || product.basePrice,
        stock: parseInt(row["Variant Inventory Qty"]) || 0,
        options,
      });
    }
  }

  return byHandle;
}

/** Genera CSV Shopify en memoria */
export function generateShopifyCsv(products: any[]): string {
  const rows: ShopifyProductRow[] = products.flatMap(productToShopifyRows);
  return Papa.unparse(rows, { columns: SHOPIFY_HEADERS });
}

/** Valida una fila Shopify. Retorna null si es válida */
export function validateShopifyRow(row: ShopifyProductRow, rowIndex: number): string | null {
  if (!row.Handle) return `Fila ${rowIndex + 1}: falta 'Handle'`;
  if (!row.Title && rowIndex === 0) return `Fila ${rowIndex + 1}: falta 'Title'`;
  return null;
}
