import { sharedLoad } from "./shared-load";

// The heavy chunks behind the lazy routes entry (`./lazy-routes.ts`). They are imported here,
// not in the wrapper components that await them: sv-router treats any function whose source
// contains `() => import(...)` as a lazy route, and a compiled component is such a function.
export const loadMonitorMapLayout = sharedLoad(() => import("./MonitorMapLayout.svelte"));
export const loadMonitorDetailPanel = sharedLoad(() => import("./MonitorDetailPanel.svelte"));
