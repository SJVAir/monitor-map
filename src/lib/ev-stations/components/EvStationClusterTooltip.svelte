<script lang="ts">
	import type { EvStationClusterMapFeature } from "../types";

	interface Props {
		feature: EvStationClusterMapFeature;
	}

	const { feature }: Props = $props();

	const levelLabel = $derived(feature.source.includes("lvl2") ? "Level 2" : "Level 3");
</script>

<div class="flex flex-col gap-1 p-1">
	<p class="font-semibold">{levelLabel} Chargers</p>
	<p class="text-sm">{feature.properties.point_count} stations</p>
</div>
