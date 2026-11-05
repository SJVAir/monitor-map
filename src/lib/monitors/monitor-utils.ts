import type { MonitorData } from "@sjvair/sdk";

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

		case "vozbox":
			return 7;

		case "aqlite":
			return 8;

		default:
			throw new Error(`Map ordering for ${monitor.device} has not been set`);
	}
}

export function getTypeShape(type: string): string {
	switch (type) {
		case "airnow":
		case "aqview":
		case "bam1022":
		case "aqlite":
			return "triangle";

		case "airgradient":
		case "purpleair":
		case "vozbox":
			return "circle";

		default:
			return "circle";
	}
}
