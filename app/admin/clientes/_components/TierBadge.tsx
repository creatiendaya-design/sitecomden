import { Badge } from "@/components/ui/badge";

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  BRONZE: { label: "🥉 Bronce", color: "bg-orange-100 text-orange-700" },
  SILVER: { label: "🥈 Plata", color: "bg-gray-100 text-gray-700" },
  GOLD: { label: "🥇 Oro", color: "bg-yellow-100 text-yellow-700" },
  PLATINUM: { label: "💎 Platino", color: "bg-purple-100 text-purple-700" },
};

export function TierBadge({ tier }: { tier: string }) {
  const { label, color } = TIER_CONFIG[tier] ?? TIER_CONFIG.BRONZE;
  return <Badge className={color}>{label}</Badge>;
}
