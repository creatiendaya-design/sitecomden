import { headers } from "next/headers";

export const CSP_NONCE_HEADER = "x-nonce";

export async function getCspNonce(): Promise<string | undefined> {
  const headerList = await headers();
  return headerList.get(CSP_NONCE_HEADER) ?? undefined;
}

export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
