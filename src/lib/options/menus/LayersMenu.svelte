<script lang="ts">
	import { FlameIcon, LayersIcon, EvChargerIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import SubmenuRow from "../rows/SubmenuRow.svelte";
	import MarkerIcon from "../rows/MarkerIcon.svelte";
	import { mapOptions } from "../map-options.svelte.js";
	import { ROW_ICONS } from "../row-icons";
</script>

<OptionsMenu id="layers" label="Layers">
	{#snippet icon()}
		<LayersIcon size={20} color="#708090" />
	{/snippet}
	<CheckboxRow label="Fire & Smoke" bind:checked={mapOptions.fireAndSmoke}>
		{#snippet icon()}
			<FlameIcon size={18} color="#ff4500" />
		{/snippet}
	</CheckboxRow>
	<SubmenuRow label="EV Chargers" bind:checked={mapOptions.evStations}>
		{#snippet icon()}
			<EvChargerIcon size={18} color="#708090" />
		{/snippet}
		<CheckboxRow label="Level 2" bind:checked={mapOptions.evLevels.lvl2}>
			{#snippet icon()}
				<MarkerIcon svg={ROW_ICONS.evLevel2} class="w-5" />
			{/snippet}
		</CheckboxRow>
		<CheckboxRow label="Level 3" bind:checked={mapOptions.evLevels.lvl3}>
			{#snippet icon()}
				<MarkerIcon svg={ROW_ICONS.evLevel3} class="w-5" />
			{/snippet}
		</CheckboxRow>
	</SubmenuRow>
</OptionsMenu>
