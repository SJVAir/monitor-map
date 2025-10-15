<script lang="ts">
	import { WindMapIntegration } from "./wind.svelte";

	const wind = new WindMapIntegration();
</script>

<div class="flex-col items-center justify-center">
  <p class="text-lg font-bold underline">Map Layers</p>
  <label for="wind" class="m-2 cursor-pointer whitespace-nowrap select-none">
    <input type="checkbox" id="wind" name="wind" bind:checked={wind.enabled} />
    Wind
  </label>
</div>
