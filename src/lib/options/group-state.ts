export type GroupState = "checked" | "unchecked" | "indeterminate" | "empty";

/** Select-all state of a group, computed only from its currently visible rows. */
export function groupState(values: ReadonlyArray<boolean>): GroupState {
	if (values.length === 0) return "empty";
	const checkedCount = values.filter(Boolean).length;
	if (checkedCount === 0) return "unchecked";
	return checkedCount === values.length ? "checked" : "indeterminate";
}

/** Applies a select-all toggle to the given (visible) rows only. */
export function setGroup(options: ReadonlyArray<{ value: boolean }>, value: boolean): void {
	for (const option of options) {
		option.value = value;
	}
}
