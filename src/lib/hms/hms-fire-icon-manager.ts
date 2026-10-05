import { asDataURI, fireIcon } from "$lib/map/icons";
import { MapIconManager } from "$lib/map/integrations/map-icon-manager";
import type { LegendCategory } from "$lib/legend/legend-data";

export type FRPTier = "sm" | "md" | "lg" | "xl" | "xxl";

export const FRP_TIERS: Record<FRPTier, { color: string; size: number }> = {
	sm: { color: "#FFD700", size: 20 },
	md: { color: "#FF8C00", size: 24 },
	lg: { color: "#FF4500", size: 28 },
	xl: { color: "#DC143C", size: 32 },
	xxl: { color: "#8B0000", size: 36 }
};

const FRP_TIER_LABELS: Record<FRPTier, string> = {
	sm: "<10",
	md: "10-49",
	lg: "50-149",
	xl: "150-349",
	xxl: "≥350"
};

/** Fire legend blocks (MW), in tier order, using the same colors as the map icons. */
export const FIRE_LEGEND_CATEGORIES: Array<LegendCategory> = (
	Object.keys(FRP_TIERS) as Array<FRPTier>
).map((tier) => ({ color: FRP_TIERS[tier].color, label: FRP_TIER_LABELS[tier] }));

export function getTierIconId(frp: number): string {
	if (frp < 10) return "hms-fire-sm";
	if (frp < 50) return "hms-fire-md";
	if (frp < 150) return "hms-fire-lg";
	if (frp < 350) return "hms-fire-xl";
	return "hms-fire-xxl";
}

export class HMSFireIconManager extends MapIconManager {
	constructor() {
		super();
		for (const [tier, { color, size }] of Object.entries(FRP_TIERS) as [
			FRPTier,
			{ color: string; size: number }
		][]) {
			const img = new Image(size, size);
			img.src = asDataURI(fireIcon(color, size));
			this.register(`hms-fire-${tier}`, img);
		}
	}
}
