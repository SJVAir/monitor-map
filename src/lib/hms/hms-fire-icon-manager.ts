import { asDataURI, fireIcon } from "$lib/map/icons.ts";
import { MapIconManager } from "$lib/map/integrations/map-icon-manager.ts";

type FRPTier = "sm" | "md" | "lg" | "xl" | "xxl";

const FRP_TIERS: Record<FRPTier, { color: string; size: number }> = {
	sm: { color: "#FFD700", size: 14 },
	md: { color: "#FF8C00", size: 18 },
	lg: { color: "#FF4500", size: 22 },
	xl: { color: "#DC143C", size: 26 },
	xxl: { color: "#8B0000", size: 30 }
};

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
