import {
	hmsOptions,
	monitorsOptions,
	settingsGroup,
	type MapContext,
	type OptionsPreset,
	type OptionValues
} from "@sjvair/map-sdk";
import type { MonitorsManager } from "$lib/monitors/monitors.svelte.js";
import {
	applyOptionChange,
	initMapOptions,
	monitorsDisplay,
	toolbarValues
} from "./option-values.svelte.js";
import { currentSelection } from "./pollutant-param";
import { buildToolbar, type ToolbarIcons } from "./toolbar-groups";

export interface MonitorMapToolbar {
	/** The toolbar's groups and defaults, rebuilt as the metadata, pollutant and basemap change. */
	readonly preset: OptionsPreset;
	/** The values to show: `mapOptions` plus the manager's pollutant. */
	readonly values: OptionValues;
	/** For `OptionsToolbar`'s `onchange`. */
	onchange(next: OptionValues, changed: string[]): void;
}

/**
 * The options toolbar's wiring for a map: its preset, the values it shows, and where a change
 * goes. Call during component setup; it registers an `$effect.pre`.
 */
export function createMonitorMapToolbar(
	map: MapContext,
	manager: Pick<MonitorsManager, "pollutant" | "meta" | "setPollutant">,
	icons: ToolbarIcons
): MonitorMapToolbar {
	// Once per map: it keeps what the metadata answers. The groups follow the metadata, the
	// pollutant and the basemap the map draws, so they're rebuilt in a $derived.
	const monitors = monitorsOptions(map);
	const preset = $derived(
		buildToolbar({
			monitors,
			settings: settingsGroup(map, {
				icon: icons.settings,
				clusters: { icon: icons.clusters },
				basemap: { icons: { basemap: icons.basemap, theme: icons.theme } },
				reset: { icon: icons.reset }
			}),
			hms: hmsOptions(map, { icon: icons.fireAndSmoke }),
			meta: manager.meta,
			selection: currentSelection(manager.pollutant, monitorsDisplay.monitorsOn),
			layersLabel: map.messages("mapsdk_options_layers"),
			overlaysLabel: map.messages("mapsdk_options_overlays"),
			icons
		})
	);

	// Defaults that arrive later (a type key once the metadata loads) fill in; a value the user
	// already has, including one from before a remount, stays.
	$effect.pre(() => initMapOptions(preset.defaults));

	// The pollutant shows the manager's; before it has one, the default's key.
	const values = $derived(
		toolbarValues(
			manager.pollutant,
			monitorsDisplay.monitorsOn,
			String(preset.defaults.pollutant ?? "pm25")
		)
	);

	return {
		get preset() {
			return preset;
		},
		get values() {
			return values;
		},
		onchange(next, changed) {
			applyOptionChange(next, changed, { manager, basemap: map.basemap });
		}
	};
}
