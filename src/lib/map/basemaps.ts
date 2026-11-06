import { MapStyle } from "@maptiler/sdk";
import type { ReferenceMapStyle } from "@maptiler/sdk";
import type { BasemapConfig } from "@sjvair/map-sdk";

/** Every MapTiler style at its highest `_V<n>` version, sorted by name. */
const BASEMAP_STYLES: ReferenceMapStyle[] = (() => {
	const latest = new Map<string, { version: number; style: ReferenceMapStyle }>();
	for (const style of Object.values(MapStyle) as ReferenceMapStyle[]) {
		const id = style.getId();
		const match = id.match(/^(.+?)_V(\d+)$/i);
		const baseName = match ? match[1] : id;
		const version = match ? parseInt(match[2], 10) : 0;
		const existing = latest.get(baseName);
		if (!existing || version > existing.version) {
			latest.set(baseName, { version, style });
		}
	}
	return Array.from(latest.values())
		.map((e) => e.style)
		.sort((a, b) => a.getName().localeCompare(b.getName()));
})();

/** The basemap the map opens on, and Reset selects: Streets v4's default variant. */
export function defaultBasemapId(): string {
	return MapStyle.STREETS_V4.getDefaultVariant().getId();
}

/**
 * The monitor map's basemaps: every MapTiler style's variants (style URLs, so map-sdk's fallback
 * can match a failed style by URL), opening on Streets v4, with no layers removed.
 */
export function monitorMapBasemaps(): BasemapConfig {
	const seen = new Set<string>();
	const styles: BasemapConfig["styles"] = [];
	for (const style of BASEMAP_STYLES) {
		for (const variant of style.getVariants()) {
			const id = variant.getId();
			if (seen.has(id)) continue;
			seen.add(id);
			styles.push({ id, style: variant.getExpandedStyleURL() });
		}
	}
	return { styles, defaultId: defaultBasemapId(), excludedLayers: [] };
}

export interface BasemapChoice {
	name: string;
	variants: Array<{ id: string; type: string; name: string }>;
}

/** The Basemap select's options (one per style name) and each one's Theme radios. */
export function basemapChoices(): BasemapChoice[] {
	return BASEMAP_STYLES.map((style) => ({
		name: style.getName(),
		variants: style
			.getVariants()
			.map((variant) => ({ id: variant.getId(), type: variant.getType(), name: variant.getName() }))
	}));
}

/** The choice that has a variant with this id. */
export function choiceForId(id: string): BasemapChoice | undefined {
	return basemapChoices().find((choice) => choice.variants.some((v) => v.id === id));
}

/**
 * The variant to show after switching to the basemap named `toBaseName`: the same variant type
 * (e.g. "DARK") as `currentId` when the new basemap offers it, otherwise its default.
 */
export function switchBasemap(currentId: string, toBaseName: string): string {
	const target = BASEMAP_STYLES.find((style) => style.getName() === toBaseName);
	if (!target) return currentId;
	const type = choiceForId(currentId)?.variants.find((v) => v.id === currentId)?.type;
	if (type && target.hasVariant(type)) return target.getVariant(type).getId();
	return target.getDefaultVariant().getId();
}
