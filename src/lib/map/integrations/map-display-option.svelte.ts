export class MapDisplayOption {
	label: string;
	value: boolean;

	constructor(label: string, value: boolean) {
		this.label = label;
		this.value = $state(value);
	}
}
