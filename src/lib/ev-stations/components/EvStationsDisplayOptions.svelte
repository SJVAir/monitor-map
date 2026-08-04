<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { evStationsMapIntegration } from "../ev-stations-map-integration.svelte";

	const { displayOptions } = evStationsMapIntegration;
</script>

<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">EV Stations</p>
	<div class="mb-2 w-full text-xs">
		<div class="w-fit">
			<ToggleSwitch
				id="ev-clusters"
				label="Marker Clusters"
				bind:value={evStationsMapIntegration.clustered}
			/>
		</div>
	</div>
	<label for="ev-lvl2" class="flex cursor-pointer gap-1 whitespace-nowrap select-none">
		<input
			type="checkbox"
			id="ev-lvl2"
			bind:checked={evStationsMapIntegration.displayOptions.lvl2.value}
		/>
		<img
			class="w-5"
			src={displayOptions.lvl2.icon!.image.src}
			alt={displayOptions.lvl2.icon!.image.alt}
		/>
		Level 2
	</label>
	<label for="ev-lvl3" class="flex cursor-pointer gap-1 whitespace-nowrap select-none">
		<input
			type="checkbox"
			id="ev-lvl3"
			bind:checked={evStationsMapIntegration.displayOptions.lvl3.value}
		/>
		<img
			class="w-5"
			src={displayOptions.lvl3.icon!.image.src}
			alt={displayOptions.lvl3.icon!.image.alt}
		/>
		Level 3
	</label>
</DisplayOption>
