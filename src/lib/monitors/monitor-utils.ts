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
