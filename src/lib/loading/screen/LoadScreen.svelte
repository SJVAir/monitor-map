<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import { LoadingScreenController } from "$lib/loading/screen/load-screen-controller.svelte.ts";

	const ls = new LoadingScreenController();
	let entered = $state(false);

	const animationTrigger: Attachment<HTMLDivElement> = (_target: HTMLDivElement) => {
		entered = true;
	};
</script>

{#if ls.enabled}
	<div
		class="absolute top-0 left-0 z-50 flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-white"
		{@attach animationTrigger}
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
	</div>
{/if}

<style>
</style>
