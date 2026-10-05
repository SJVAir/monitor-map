<script lang="ts">
	import { ContrastIcon, MapIcon, NetworkIcon, RotateCcwIcon, SettingsIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import RadioRow from "../rows/RadioRow.svelte";
	import { resetMapOptions } from "../reset-map-options";
	import { MAP_STYLE_OPTIONS } from "$lib/map/utils";
	import { mapStyleState } from "$lib/map/map-style-state.svelte.js";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import { evStationsMapIntegration } from "$lib/ev-stations/ev-stations-map-integration.svelte";
</script>

<OptionsMenu id="settings" label="Settings" iconOnly alignRight>
	{#snippet icon()}
		<SettingsIcon size={20} color="#696969" />
	{/snippet}
	<CheckboxRow
		label="Marker Clusters"
		bind:checked={
			() => monitorsMapIntegration.clustered && evStationsMapIntegration.clustered,
			(value) => {
				monitorsMapIntegration.clustered = value;
				evStationsMapIntegration.clustered = value;
			}
		}
	>
		{#snippet icon()}
			<NetworkIcon size={18} color="#1e90ff" />
		{/snippet}
	</CheckboxRow>
	<hr class="my-1 border-gray-200" />
	<div class="px-3 py-1.5 text-sm">
		<label for="monitor-map-basemap" class="mb-1 flex items-center gap-2 font-semibold">
			<MapIcon size={18} color="#708090" />
			Basemap
		</label>
		<select
			id="monitor-map-basemap"
			class="w-full rounded-md border border-gray-300 bg-white p-1.5"
			bind:value={
				() => mapStyleState.referenceStyle, (style) => mapStyleState.selectReferenceStyle(style)
			}
		>
			{#each MAP_STYLE_OPTIONS as style (style.getId())}
				<option value={style}>{style.getName()}</option>
			{/each}
		</select>
	</div>
	<hr class="my-1 border-gray-200" />
	<p class="flex items-center gap-2 px-3 pt-1.5 text-sm font-semibold">
		<ContrastIcon size={18} color="#708090" />
		Theme
	</p>
	{#each mapStyleState.referenceStyle.getVariants() as variant (variant.getId())}
		<RadioRow
			name="monitor-map-theme"
			label={variant.getName()}
			checked={variant === mapStyleState.variant}
			onselect={() => mapStyleState.selectVariant(variant)}
		/>
	{/each}
	<hr class="my-1 border-gray-200" />
	<div class="px-3 py-1.5">
		<button
			type="button"
			class="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
			onclick={resetMapOptions}
		>
			<RotateCcwIcon size={16} />
			Reset Map Options
		</button>
	</div>
</OptionsMenu>
