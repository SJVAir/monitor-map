<script lang="ts">
	import { NetworkIcon, RotateCcwIcon, SettingsIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import { mapOptions, resetMapOptions } from "../map-options.svelte.js";
	import { asPollutant } from "../pollutant-param";
	import { monitorsManager } from "$lib/monitors/monitors.svelte.js";

	function reset() {
		resetMapOptions(asPollutant(monitorsManager.meta?.default_pollutant));
	}
</script>

<OptionsMenu id="settings" label="Settings" iconOnly alignRight>
	{#snippet icon()}
		<SettingsIcon size={20} color="#696969" />
	{/snippet}
	<!-- Monitors' and EV chargers' clustering together. -->
	<CheckboxRow label="Marker Clusters" bind:checked={mapOptions.clustered}>
		{#snippet icon()}
			<NetworkIcon size={18} color="#1e90ff" />
		{/snippet}
	</CheckboxRow>
	<hr class="my-1 border-gray-200" />
	<div class="px-3 py-1.5">
		<button
			type="button"
			class="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
			onclick={reset}
		>
			<RotateCcwIcon size={16} />
			Reset Map Options
		</button>
	</div>
</OptionsMenu>
