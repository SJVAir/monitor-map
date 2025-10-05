<script lang="ts">
	import { LoadingQueue } from "$lib/load-screen/load-screen.svelte.ts";

	const lq = new LoadingQueue();
</script>

{#if lq.loading}
	<div
		class="absolute top-0 left-0 z-50 flex h-full w-full flex-col items-center justify-center gap-4 bg-sky-400"
	>
		<div>
			<enhanced:img src="$lib/assets/sjvair-icon.webp" alt="An alt text" />
			<enhanced:img src="$lib/assets/sjvair-sjv.webp" alt="An alt text" />
			<enhanced:img src="$lib/assets/sjvair-air.webp" alt="An alt text" />
		</div>
		<h1 class="text-lg">A cooler loading screen awaits....</h1>
		<div
			class="h-16 w-16 animate-spin rounded-full border-8 border-blue-500 border-t-transparent"
		></div>
	</div>
{/if}
