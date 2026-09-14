<script lang="ts">
	import type { MonitorsMeta } from "@sjvair/sdk";
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import SegmentedControl from "$lib/components/SegmentedControl.svelte";
	import ToggleSwitch from "$lib/components/ToggleSwitch.svelte";
	import { monitorsManager } from "../monitors.svelte";
	import { monitorsMapIntegration } from "../monitors-map-integration.svelte";

	interface PollutantDisplayOptions {
		label: string;
		value: MonitorsMeta["default_pollutant"];
	}

	const pollutants: Array<PollutantDisplayOptions> = [
		{
			label: "PM 2.5",
			value: "pm25"
		},
		{
			label: "Ozone",
			value: "o3"
		}
	];

	// "inside" is a location filter (indoor vs outdoor), not tied to a monitor type or
	// pollutant, so it's always shown, like "inactive".
	const uiOnlyDisplayOptions = new Set(["inactive", "inside"]);

	// "sjvair" (SJVAir non-FEM) isn't its own backend monitor type — it groups is_sjvair-flagged
	// purpleair devices with airgradient devices (see monitorsMapIntegration.filters/featuresByType),
	// so its visibility follows whichever of those two types supports the current pollutant.
	const sjvairUnderlyingTypes = ["purpleair", "airgradient"];

	function pollutantSupportedByType(type: string): boolean {
		const deviceMeta = monitorsManager.meta?.monitors[type];
		return (
			!!deviceMeta && !!monitorsManager.pollutant && monitorsManager.pollutant in deviceMeta.entries
		);
	}

	const monitorDisplayOptions = $derived.by(() => {
		return Object.entries(monitorsMapIntegration.displayOptions).filter(([key]) => {
			if (uiOnlyDisplayOptions.has(key)) return true;
			if (key === "sjvair") return sjvairUnderlyingTypes.some(pollutantSupportedByType);
			return pollutantSupportedByType(key);
		});
	});

	$effect(() => {
		monitorsManager.list = [];
		monitorsManager.latest = null;
		monitorsManager.update();
	});
</script>

<DisplayOption>
	<p class="text-lg font-bold underline">Air Monitors</p>
	<div class="mb-2 w-full text-xs">
		<div class="w-fit">
			<ToggleSwitch
				id="monitor-clusters"
				label="Marker Clusters"
				bind:value={monitorsMapIntegration.clustered}
			></ToggleSwitch>
		</div>
		{#if monitorsManager.pollutant}
			<SegmentedControl
				segmentLabel="Pollutant:"
				options={pollutants}
				bind:group={monitorsManager.pollutant}
			/>
		{/if}
	</div>

	{#each monitorDisplayOptions as [id, option] (option.label)}
		{@const inputId = `${id}-monitor-display-option`}
		<label for={inputId} class="flex cursor-pointer gap-1 whitespace-nowrap select-none">
			<input type="checkbox" id={inputId} name={option.label} bind:checked={option.value} />
			{#if option.icon}
				<img class="w-3" src={option.icon.image.src} alt={option.icon.image.alt} />
			{/if}
			{option.label}
		</label>
	{/each}
</DisplayOption>
