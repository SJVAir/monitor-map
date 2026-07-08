<script lang="ts">
	import "./app.css";
	import { Router } from "sv-router";
	import { provideMonitorMapRouter, type MonitorMapRouterApi } from "./lib";
	import { route, navigate, p, isActive } from "./router";

	// The host router's navigate/p/isActive are typed against its own concrete route tree,
	// which is narrower than MonitorMapRouterApi's deliberately loose `string` signatures.
	provideMonitorMapRouter({
		route,
		navigate,
		p,
		isActive,
		basePath: ""
	} as MonitorMapRouterApi);
</script>

<Router />
