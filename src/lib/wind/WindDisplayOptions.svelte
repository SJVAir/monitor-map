<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import { windMapIntegration } from "./wind.svelte";
</script>

<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">Map Layers</p>
	<label for="wind" class="m-2 cursor-pointer whitespace-nowrap select-none">
		<input type="checkbox" id="wind" name="wind" bind:checked={windMapIntegration.enabled} />
		Wind
	</label>
</DisplayOption>
