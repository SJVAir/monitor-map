<script lang="ts">
	import {
		hmsOptions,
		monitorsOptions,
		OptionsToolbar,
		settingsGroup,
		type MapContext,
		type OptionIcon,
		type OptionValues
	} from "@sjvair/map-sdk";
	import type { MonitorsMeta } from "@sjvair/sdk";
	import {
		applyOptionChange,
		initMapOptions,
		monitorsDisplay,
		toolbarValues
	} from "$lib/options/option-values.svelte.js";
	import { buildToolbar, type ToolbarIcons } from "$lib/options/toolbar-groups";
	import { currentSelection } from "$lib/options/pollutant-param";

	interface Props {
		/** Called after each change is applied, with what the toolbar passed. */
		onchanged?: (next: OptionValues, changed: string[]) => void;
	}

	let { onchanged }: Props = $props();

	const icon: OptionIcon = { svg: "<svg></svg>" };
	const icons = Object.fromEntries(
		[
			"monitors",
			"pm25",
			"o3",
			"none",
			"collocation",
			"layers",
			"fireAndSmoke",
			"evStations",
			"overlays",
			"wind",
			"settings",
			"clusters",
			"basemap",
			"theme",
			"reset",
			"evLevel2",
			"evLevel3"
		].map((k) => [k, icon])
	) as unknown as ToolbarIcons;

	const meta = {
		monitors: { purpleair: { label: "PurpleAir" }, airnow: { label: "AirNow" } },
		available_pollutants: ["pm25", "o3"],
		default_pollutant: "pm25"
	} as unknown as MonitorsMeta;

	const answer = <T,>(value: T) => Promise.resolve(value);
	const entries: Record<string, { label: string; units: string }> = {
		pm25: { label: "PM2.5", units: "µg/m³" },
		o3: { label: "Ozone", units: "ppb" }
	};
	const groupOf: Record<string, string> = { airnow: "reference", purpleair: "lowcost" };

	let current = $state("streets");
	const map = {
		messages: (key: string) => key,
		metadata: {
			scale: () => answer("unavailable"),
			attribution: () => answer("unavailable"),
			entryType: ({ entryType }: { entryType: string }) =>
				answer(entries[entryType] ? { ...entries[entryType], precision: null } : "unavailable"),
			entryTypeHelp: ({ entryType }: { entryType: string }) => answer(`${entryType} help`),
			monitorTypeLabel: (type: string) =>
				answer(meta.monitors[type as keyof typeof meta.monitors]?.label ?? "unavailable"),
			monitorGroups: () =>
				answer([
					{ key: "reference", label: "Reference-grade", order: 1 },
					{ key: "lowcost", label: "Low-cost sensors", order: 2 }
				]),
			monitorTypeGroup: (type: string) => answer(groupOf[type] ?? "unavailable"),
			monitorTypeReports: () => answer(true)
		},
		basemap: {
			styles: [
				{ id: "streets", style: "", basemap: "Streets", name: "Default", isDefault: true },
				{ id: "streets-dark", style: "", basemap: "Streets", name: "Dark" }
			],
			defaultId: "streets",
			get current() {
				return current;
			},
			select(id: string) {
				current = id;
			},
			onFallback: () => () => {}
		}
	} as unknown as MapContext;

	const manager = $state({
		pollutant: "pm25" as string | null,
		setPollutant(p: "pm25" | "o3") {
			manager.pollutant = p;
		}
	});

	const monitors = monitorsOptions(map);
	const toolbar = $derived(
		buildToolbar({
			monitors,
			settings: settingsGroup(map, {
				icon: icons.settings,
				clusters: { icon: icons.clusters },
				basemap: { icons: { basemap: icons.basemap, theme: icons.theme } },
				reset: { icon: icons.reset }
			}),
			hms: hmsOptions(map, { icon: icons.fireAndSmoke }),
			meta,
			selection: currentSelection(manager.pollutant, monitorsDisplay.monitorsOn),
			layersLabel: map.messages("mapsdk_options_layers"),
			overlaysLabel: map.messages("mapsdk_options_overlays"),
			icons
		})
	);

	$effect.pre(() => initMapOptions(toolbar.defaults));

	function onchange(next: OptionValues, changed: string[]) {
		applyOptionChange(next, changed, { manager, basemap: map.basemap });
		onchanged?.(next, changed);
	}
</script>

<OptionsToolbar
	{map}
	groups={toolbar.groups}
	values={toolbarValues(manager.pollutant, monitorsDisplay.monitorsOn, "pm25")}
	{onchange}
	defaults={toolbar.defaults}
	basemapKey="basemap"
/>
