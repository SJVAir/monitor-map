<script lang="ts">
	import { onMount } from "svelte";
	import { LoadingScreen } from "$lib/loading/screen/load-screen.svelte.ts";

	const ls = new LoadingScreen();
	let entered = $state(false);

	onMount(() => {
		// Trigger animation after mount
		setTimeout(() => {
			entered = true;
		}, 10); // slight delay for effect
	});
</script>

{#if ls.enabled}
	<div
		class="absolute top-0 left-0 z-50 flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-white"
	>
		<div>
			<enhanced:img
				src="$lib/assets/sjvair-icon.webp"
				alt="SJVAir Icon"
				class="icon inline-block h-24 w-auto transition-all duration-500 ease-out"
				class:translate-x-0={entered}
				class:-translate-x-full={!entered}
				class:opacity-100={entered}
				class:opacity-0={!entered}
			/>
			<enhanced:img
				src="$lib/assets/sjvair-sjv.webp"
				alt="SJV"
				class="sjv inline-block h-24 w-auto transition-all duration-500 ease-out"
				class:translate-y-0={entered}
				class:-translate-y-full={!entered}
				class:opacity-100={entered}
				class:opacity-0={!entered}
			/>
			<enhanced:img
				src="$lib/assets/sjvair-air.webp"
				alt="Air"
				class="air inline-block h-24 w-auto transition-all duration-500 ease-out"
				class:translate-y-0={entered}
				class:translate-y-full={!entered}
				class:opacity-100={entered}
				class:opacity-0={!entered}
			/>
		</div>
		<!--
		<enhanced:img
			src="$lib/assets/sjvair-icon.webp"
			alt="SJVAir Icon"
			class={`icon inline-block transition-opacity transition-transform duration-700 ease-out
    ${entered ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"}`}
		/>
		<enhanced:img
			src="$lib/assets/sjvair-sjv.webp"
			alt="SJV"
			class={`sjv inline-block transition-opacity transition-transform duration-700 ease-out
    ${entered ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}
		/>
		<enhanced:img
			src="$lib/assets/sjvair-air.webp"
			alt="Air"
			class={`air inline-block transition-opacity transition-transform duration-700 ease-out
    ${entered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
		/>
		<enhanced:img src="$lib/assets/sjvair-icon.webp" alt="SJVAir Icon" class="icon inline-block" />
		<enhanced:img src="$lib/assets/sjvair-sjv.webp" alt="SJV" class="sjv inline-block" />
		<enhanced:img src="$lib/assets/sjvair-air.webp" alt="Air" class="air inline-block" />
		<h1 class="text-lg">A cooler loading screen awaits....</h1>
		<div
			class="h-16 w-16 animate-spin rounded-full border-8 border-blue-500 border-t-transparent"
		></div>
    -->
	</div>
{/if}

<style>
</style>
