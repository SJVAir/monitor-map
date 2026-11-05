<script lang="ts">
	import { RadioTowerIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import GroupRow from "../rows/GroupRow.svelte";
	import MarkerIcon from "../rows/MarkerIcon.svelte";
	import { mapOptions } from "../map-options.svelte.js";
	import { ROW_ICONS } from "../row-icons";
	import { monitorsManager } from "$lib/monitors/monitors.svelte.js";
	import {
		LOW_COST_TYPES,
		REFERENCE_GRADE_TYPES,
		typeSupportsPollutant,
		type MonitorGroupType
	} from "$lib/monitors/monitor-groups";

	const TYPE_LABELS: Record<MonitorGroupType, string> = {
		airnow: "AirNow",
		aqlite: "AQLite",
		aqview: "AQview",
		bam1022: "SJVAir",
		airgradient: "AirGradient",
		purpleair: "PurpleAir",
		vozbox: "VOZbox"
	};

	/** A type's filter as the `{ value }` option GroupRow binds to. */
	function typeOption(type: MonitorGroupType) {
		return {
			get value() {
				return mapOptions.monitorTypes[type] ?? false;
			},
			set value(value: boolean) {
				mapOptions.monitorTypes[type] = value;
			}
		};
	}

	// Rows for types that don't report the current pollutant are hidden (meta-driven).
	function visibleRows(types: ReadonlyArray<MonitorGroupType>) {
		return types
			.filter((type) =>
				typeSupportsPollutant(monitorsManager.meta, type, monitorsManager.pollutant)
			)
			.map((type) => ({ key: type, label: TYPE_LABELS[type], option: typeOption(type) }));
	}

	const referenceGrade = $derived(visibleRows(REFERENCE_GRADE_TYPES));
	const lowCost = $derived(visibleRows(LOW_COST_TYPES));
</script>

<OptionsMenu id="monitors" label="Monitors" disabled={!mapOptions.monitorsOn}>
	{#snippet icon()}
		<RadioTowerIcon size={20} color="#4682b4" />
	{/snippet}
	<GroupRow label="Reference-grade" options={referenceGrade}>
		{#snippet icon()}
			<MarkerIcon svg={ROW_ICONS.referenceGrade} />
		{/snippet}
	</GroupRow>
	<GroupRow label="Low-cost sensors" options={lowCost}>
		{#snippet icon()}
			<MarkerIcon svg={ROW_ICONS.lowCost} />
		{/snippet}
	</GroupRow>
	<hr class="my-1 border-gray-200" />
	<CheckboxRow label="Inactive" bind:checked={mapOptions.inactive}>
		{#snippet icon()}
			<MarkerIcon svg={ROW_ICONS.inactive} />
		{/snippet}
	</CheckboxRow>
	<CheckboxRow label="Inside" bind:checked={mapOptions.inside}>
		{#snippet icon()}
			<MarkerIcon svg={ROW_ICONS.inside} />
		{/snippet}
	</CheckboxRow>
	{#if monitorsManager.pollutant === "pm25"}
		<CheckboxRow label="Collocation Sites" bind:checked={mapOptions.collocationSites}>
			{#snippet icon()}
				<MarkerIcon svg={ROW_ICONS.collocationSites} class="w-5" />
			{/snippet}
		</CheckboxRow>
	{/if}
</OptionsMenu>
