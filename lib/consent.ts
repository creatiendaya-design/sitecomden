export const CONSENT_KEY = "shopgood_consent";

export type ConsentValue = "all" | "essential";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(CONSENT_KEY) as ConsentValue) ?? null;
}

export function hasMarketingConsent(): boolean {
  return getConsent() === "all";
}
