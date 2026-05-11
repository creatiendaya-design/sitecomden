/** Email canonicalization used by promotions / newsletter flows to prevent
 *  the same person claiming a one-time discount via plus-addressing
 *  (`me+1@gmail.com`, `me+2@gmail.com`...) or Gmail dot tricks
 *  (`m.e@gmail.com` = `me@gmail.com`). */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Returns the canonical form of an email used for deduplication. Always
 *  lowercases and trims; for Gmail/Googlemail also strips dots from the
 *  local part. Plus-addressing is stripped for all providers since virtually
 *  every major provider treats `+suffix` as a routing hint to the same
 *  inbox. Returns the original lowercased string if input is malformed. */
export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  const atIdx = trimmed.indexOf("@");
  if (atIdx <= 0 || atIdx === trimmed.length - 1) return trimmed;
  let local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);

  const plusIdx = local.indexOf("+");
  if (plusIdx >= 0) local = local.slice(0, plusIdx);

  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}
