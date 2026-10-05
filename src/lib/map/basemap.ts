/** The slices of MapTiler's MapStyleVariant / ReferenceMapStyle this module needs. */
export interface StyleVariantLike {
	getType(): string;
}

export interface ReferenceStyleLike<V extends StyleVariantLike> {
	hasVariant(type: string): boolean;
	getVariant(type: string): V;
	getDefaultVariant(): V;
}

/**
 * Variant to show after switching basemaps: the same variant type (e.g. "DARK") when the new
 * basemap offers it, otherwise the new basemap's default.
 */
export function variantForStyle<V extends StyleVariantLike>(
	style: ReferenceStyleLike<V>,
	previous: StyleVariantLike | null
): V {
	if (previous && style.hasVariant(previous.getType())) {
		return style.getVariant(previous.getType());
	}
	return style.getDefaultVariant();
}
