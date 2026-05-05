import type { MonitorData, SJVAirEntryLevel } from "@sjvair/sdk";

export function getCurrentLevel(
	value: string | number,
	levels: Array<SJVAirEntryLevel>
): SJVAirEntryLevel | undefined {
	value = typeof value === "string" ? parseInt(value, 10) : value;
	return levels.find((lvl) => {
		return value >= lvl.range[0] && value <= lvl.range[1];
	});
}

export function getOrder(monitor: MonitorData): number {
	switch (monitor.type) {
		case "airgradient":
			return 5;

		case "airnow":
			return 2;

		case "aqview":
			return 3;

		case "bam1022":
			return 6;

		case "purpleair":
			return monitor.is_sjvair ? 4 : 1;

		default:
			throw new Error(`Map ordering for ${monitor.device} has not been set`);
	}
}

export function getTypeShape(type: string): string {
	switch (type) {
		case "airgradient":
			return "circle";

		case "airnow":
		case "aqview":
		case "bam1022":
			return "triangle";

		case "purpleair":
			return "square";

		default:
			return "circle";
	}
}
