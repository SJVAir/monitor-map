<script lang="ts">
	import { SquareStackIcon, WindIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import CheckboxRow from "../rows/CheckboxRow.svelte";
	import { mapOptions } from "../map-options.svelte.js";
</script>

<!-- Independent checkboxes: several overlays may be on at once. -->
<OptionsMenu id="overlays" label="Overlays" alignRight>
	{#snippet icon()}
		<SquareStackIcon size={20} color="#708090" />
	{/snippet}
	<CheckboxRow label="Wind" bind:checked={mapOptions.wind}>
		{#snippet icon()}
			<WindIcon size={18} color="#1e90ff" />
		{/snippet}
	</CheckboxRow>
</OptionsMenu>
