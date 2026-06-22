import { MapImageIcon } from "./types";

export class MapDisplayOption {
	icon?: MapImageIcon;
	label: string;
	value: boolean;

	constructor(label: string, value: boolean, icon?: MapImageIcon) {
		this.icon = icon;
		this.label = label;
		this.value = $state(value);
	}
}
