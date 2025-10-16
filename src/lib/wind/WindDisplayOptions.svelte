<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import { WindMapIntegration } from "./wind.svelte";

	const wind = new WindMapIntegration();
</script>

<DisplayOption>
	<p class="text-lg font-bold whitespace-nowrap underline">Map Layers</p>
	<label for="wind" class="m-2 cursor-pointer whitespace-nowrap select-none">
		<input type="checkbox" id="wind" name="wind" bind:checked={wind.enabled} />
		Wind
	</label>
</DisplayOption>
