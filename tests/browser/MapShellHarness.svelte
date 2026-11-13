<script lang="ts">
	import { createMap } from "@sjvair/map-sdk";
	import MapShell from "$lib/map/MapShell.svelte";
	import ToolbarHarness from "./ToolbarHarness.svelte";

	// A real map context and a real MapShell with its detail panel open, so the map's own box is
	// a third narrower than the shell. No key: tiles never load, which the test doesn't need.
	const map = createMap({ config: { maptilerKey: "unused" } });
</script>

<div class="h-screen w-full">
	<MapShell {map} ready={true} panelOpen={true} routerEscapeHatch={false}>
		{#snippet toolbar()}
			<ToolbarHarness />
		{/snippet}
		<div>Panel</div>
	</MapShell>
</div>
