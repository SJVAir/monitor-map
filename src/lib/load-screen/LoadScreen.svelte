<script lang="ts">
	import { LoadingQueue } from "$lib/load-screen/load-screen.svelte.ts";

	const lq = new LoadingQueue();
</script>

{#if lq.loading}
  <div class="absolute top-0 left-0 bg-sky-400 w-full h-full z-50 flex flex-col justify-center items-center gap-4">
    <h1 class="text-lg">A cooler loading screen awaits....</h1>
    <div class="h-16 w-16 rounded-full border-8 border-t-transparent border-blue-500 animate-spin"></div>
  </div>
{/if}

