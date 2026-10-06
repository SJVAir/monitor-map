<script lang="ts">
	import { FlameIcon, LayersIcon, EvChargerIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import SubmenuRow from "../rows/SubmenuRow.svelte";
	import MarkerIcon from "../rows/MarkerIcon.svelte";
	import { hmsFireMapIntegration } from "$lib/hms/hms-fire-map-integration.svelte";
	import { hmsSmokeMapIntegration } from "$lib/hms/hms-smoke-map-integration.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";

	const levels = $derived(evStationsMapIntegration.displayOptions);
</script>

<OptionsMenu id="layers" label="Layers">
	{#snippet icon()}
		<LayersIcon size={20} color="#708090" />
	{/snippet}
	<CheckboxRow
		label="Fire & Smoke"
		bind:checked={
			() => hmsFireMapIntegration.enabled && hmsSmokeMapIntegration.enabled,
			(value) => {
				hmsFireMapIntegration.enabled = value;
				hmsSmokeMapIntegration.enabled = value;
			}
		}
	>
		{#snippet icon()}
			<FlameIcon size={18} color="#ff4500" />
		{/snippet}
	</CheckboxRow>
	<SubmenuRow label="EV Chargers" bind:checked={evStationsMapIntegration.enabled}>
		{#snippet icon()}
			<EvChargerIcon size={18} color="#708090" />
		{/snippet}
		<CheckboxRow label="Level 2" bind:checked={evStationsMapIntegration.displayOptions.lvl2.value}>
			{#snippet icon()}
				<MarkerIcon icon={levels.lvl2.icon} class="w-5" />
			{/snippet}
		</CheckboxRow>
		<CheckboxRow label="Level 3" bind:checked={evStationsMapIntegration.displayOptions.lvl3.value}>
			{#snippet icon()}
				<MarkerIcon icon={levels.lvl3.icon} class="w-5" />
			{/snippet}
		</CheckboxRow>
	</SubmenuRow>
</OptionsMenu>
