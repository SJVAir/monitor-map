export interface MonitorMapConfig {
	maptilerKey: string;
	nrelKey: string;
}

let current: MonitorMapConfig | null = null;

/** Hosts call this once at startup, before the map or the EV layer is used. */
export function configureMonitorMap(config: MonitorMapConfig): void {
	current = { ...config };
}

export function monitorMapConfig(): MonitorMapConfig {
	if (!current) throw new Error("monitor-map: call configureMonitorMap() first");
	return current;
}
