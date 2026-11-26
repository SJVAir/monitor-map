<script lang="ts">
	import {
		createMap,
		MapView,
		OptionsToolbar,
		type LegendData,
		type OptionGroup,
		type OptionValues
	} from "@sjvair/map-sdk";
	import LegendOverlay from "$lib/legend/LegendOverlay.svelte";

	// A real map context, never attached (MapView's `active={false}`): no WebGL, no tiles, no key.
	const map = createMap({ config: { maptilerKey: "unused" } });

	// Four plugins' scales, so the expanded legend fills its space up to below the toolbar.
	for (const id of ["one", "two", "three", "four"]) {
		const legend: LegendData = {
			pluginId: id,
			title: id,
			units: "µg/m³",
			scale: {
				kind: "range",
				levels: [
					{ min: 0, color: "#00e400", label: "Good", opacity: null },
					{ min: 10, color: "#ffff00", label: "Moderate", opacity: null }
				]
			}
		} as LegendData;
		map.addPlugin({ id, setup: () => () => {}, legend: () => legend });
	}

	// Two tall groups whose menus and narrow panel reach down over the legend.
	const rows = Array.from({ length: 14 }, (_, i) => ({
		kind: "checkbox" as const,
		id: `row${i}`,
		label: `Row ${i + 1}`
	}));
	const groups: OptionGroup[] = [
		{ id: "first", label: "First", rows },
		{ id: "second", label: "Second", rows: rows.map((r) => ({ ...r, id: `${r.id}b` })) }
	];
	let values: OptionValues = $state({});
</script>

<div class="h-screen w-full">
	<MapView {map} active={false} class="h-full w-full">
		{#snippet toolbar()}
			<OptionsToolbar {groups} {values} onchange={(next) => (values = next)} />
		{/snippet}
		{#snippet overlays()}
			<LegendOverlay {map} />
		{/snippet}
	</MapView>
</div>
