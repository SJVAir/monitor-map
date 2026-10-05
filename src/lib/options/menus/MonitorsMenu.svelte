<script lang="ts">
	import { CrosshairIcon, RadioTowerIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import GroupRow from "../rows/GroupRow.svelte";
	import MarkerIcon from "../rows/MarkerIcon.svelte";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import { collocationSitesMapIntegration } from "$lib/collocation-sites/collocations-map-integration.svelte";
	import {
		LOW_COST_TYPES,
		REFERENCE_GRADE_TYPES,
		typeSupportsPollutant,
		type MonitorGroupType
	} from "$lib/monitors/monitor-groups";

	// Rows for types that don't report the current pollutant are hidden (meta-driven).
	function visibleRows(types: ReadonlyArray<MonitorGroupType>) {
		const displayOptions = monitorsMapIntegration.displayOptions;
		return types
			.filter((type) =>
				typeSupportsPollutant(monitorsManager.meta, type, monitorsManager.pollutant)
			)
			.map((type) => ({
				key: type,
				label: displayOptions[type].label,
				option: displayOptions[type]
			}));
	}

	const referenceGrade = $derived(visibleRows(REFERENCE_GRADE_TYPES));
	const lowCost = $derived(visibleRows(LOW_COST_TYPES));
	const icons = monitorsMapIntegration.icons;
</script>

<OptionsMenu id="monitors" label="Monitors" disabled={!monitorsMapIntegration.enabled}>
	{#snippet icon()}
		<RadioTowerIcon size={20} color="#4682b4" />
	{/snippet}
	<GroupRow label="Reference-grade" options={referenceGrade}>
		{#snippet icon()}
			<MarkerIcon icon={icons.get("outside-display-triangle")} />
		{/snippet}
	</GroupRow>
	<GroupRow label="Low-cost sensors" options={lowCost}>
		{#snippet icon()}
			<MarkerIcon icon={icons.get("outside-display-circle")} />
		{/snippet}
	</GroupRow>
	<hr class="my-1 border-gray-200" />
	<CheckboxRow label="Inactive" bind:checked={monitorsMapIntegration.displayOptions.inactive.value}>
		{#snippet icon()}
			<MarkerIcon icon={monitorsMapIntegration.displayOptions.inactive.icon} />
		{/snippet}
	</CheckboxRow>
	<CheckboxRow label="Inside" bind:checked={monitorsMapIntegration.displayOptions.inside.value}>
		{#snippet icon()}
			<MarkerIcon icon={monitorsMapIntegration.displayOptions.inside.icon} />
		{/snippet}
	</CheckboxRow>
	{#if monitorsManager.pollutant === "pm25"}
		<CheckboxRow label="Collocation Sites" bind:checked={collocationSitesMapIntegration.enabled}>
			{#snippet icon()}
				<CrosshairIcon size={16} color="#4A5FC6" />
			{/snippet}
		</CheckboxRow>
	{/if}
</OptionsMenu>
