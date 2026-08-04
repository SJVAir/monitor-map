<script lang="ts">
	import { monitorsManager } from "../monitors.svelte";

	const label = $derived(monitorsManager.pollutant === "pm25" ? "PM 2.5" : "Ozone");
	const values = $derived(
		monitorsManager.pollutant === "pm25" ? [12, 35, 55, 150, 250] : [55, 71, 86, 106, 201]
	);
</script>

<div class="flex min-w-50 flex-col rounded bg-white px-[1.5em] py-[0.5em] shadow">
	<p class="text-center font-semibold whitespace-nowrap">
		{label} Concentration
	</p>
	<div class="map-legend-bar inline-block h-[1.5em]">&nbsp;</div>
	<div class="mb-[1.5em] flex">
		<div class="h-[0.5em] w-1/5 shrink-0 border-l border-black">
			<span class="relative top-[0.5em] right-[0.3em]">0</span>
		</div>
		{#each values as value, idx (idx)}
			<div class="h-[0.5em] w-1/5 shrink-0 border-l border-black last:relative last:right-px">
				<span class="relative top-[0.5em] {idx >= 3 ? 'right-[0.8em]' : 'right-[0.5em]'}"
					>{value}</span
				>
			</div>
		{/each}
	</div>
</div>

<style>
	.map-legend-bar {
		background: linear-gradient(
			90deg,
			#00e400 0%,
			#ffff00 20%,
			#ff7e00 40%,
			#ff0000 60%,
			#8f3f97 80%,
			#7e0023 100%
		);
	}
</style>
