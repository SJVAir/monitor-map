import type {
	MonitorsOptions,
	OptionCheckbox,
	OptionGroup,
	OptionIcon,
	OptionsPreset,
	OptionValues
} from "@sjvair/map-sdk";
import type { MonitorsMeta } from "@sjvair/sdk";
import { asPollutant } from "./pollutant-param";

export interface ToolbarIcons {
	monitors: OptionIcon;
	pm25: OptionIcon;
	o3: OptionIcon;
	none: OptionIcon;
	collocation: OptionIcon;
	layers: OptionIcon;
	fireAndSmoke: OptionIcon;
	evStations: OptionIcon;
	overlays: OptionIcon;
	wind: OptionIcon;
	settings: OptionIcon;
	clusters: OptionIcon;
	basemap: OptionIcon;
	theme: OptionIcon;
	reset: OptionIcon;
	evLevel2: OptionIcon;
	evLevel3: OptionIcon;
}

/** The metadata's monitor types, sorted by label. */
export function monitorTypes(
	meta: { monitors: Record<string, { label: string }> } | null
): string[] {
	if (!meta) return [];
	return Object.keys(meta.monitors).sort((a, b) =>
		meta.monitors[a].label.localeCompare(meta.monitors[b].label, undefined, {
			sensitivity: "base"
		})
	);
}

/** The pollutants the map can show that the metadata offers: `pm25`, then `o3`. */
export function mapPollutants(meta: { available_pollutants: string[] } | null): string[] {
	if (!meta) return [];
	return ["pm25", "o3"].filter((p) => meta.available_pollutants.includes(p));
}

export function buildToolbar(input: {
	monitors: MonitorsOptions;
	settings: OptionsPreset;
	hms: { row: OptionCheckbox; defaults: OptionValues };
	meta: MonitorsMeta | null;
	selection: string | null;
	layersLabel: string;
	overlaysLabel: string;
	icons: ToolbarIcons;
}): OptionsPreset {
	const { icons, meta, selection, hms, settings } = input;
	const pollutants = mapPollutants(meta);
	const monitors = input.monitors.groups({
		types: monitorTypes(meta),
		pollutants,
		pollutant: selection === "none" ? null : selection,
		defaultPollutant: asPollutant(meta?.default_pollutant) ?? undefined,
		hasInactive: true,
		hasInside: true,
		collocation: true,
		none: true,
		icons: {
			monitors: icons.monitors,
			pollutant: { pm25: icons.pm25, o3: icons.o3 },
			none: icons.none,
			collocation: icons.collocation
		}
	});

	// monitor-map's own rows; the presets default theirs.
	const layersDefaults: OptionValues = { evStations: false, "ev:lvl2": true, "ev:lvl3": true };
	const layers: OptionGroup = {
		id: "layers",
		label: input.layersLabel,
		icon: icons.layers,
		cluster: "options",
		rows: [
			hms.row,
			{
				kind: "checkbox",
				id: "evStations",
				label: "EV Chargers",
				icon: icons.evStations,
				children: [
					{ kind: "checkbox", id: "ev:lvl2", label: "Level 2", icon: icons.evLevel2 },
					{ kind: "checkbox", id: "ev:lvl3", label: "Level 3", icon: icons.evLevel3 }
				]
			}
		]
	};
	const overlaysDefaults: OptionValues = { wind: false };
	const overlays: OptionGroup = {
		id: "overlays",
		label: input.overlaysLabel,
		icon: icons.overlays,
		align: "end",
		cluster: "options",
		rows: [{ kind: "checkbox", id: "wind", label: "Wind", icon: icons.wind }]
	};

	const defaults: OptionValues = {
		...monitors.defaults,
		...hms.defaults,
		...settings.defaults,
		...layersDefaults,
		...overlaysDefaults
	};
	// Before the metadata loads, Reset leaves the pollutant as it is.
	if (pollutants.length === 0) delete defaults.pollutant;

	return {
		groups: [
			...monitors.groups.map((g) => ({ ...g, cluster: "monitors" })),
			layers,
			overlays,
			...settings.groups.map((g) => ({ ...g, cluster: "options" }))
		],
		defaults
	};
}
