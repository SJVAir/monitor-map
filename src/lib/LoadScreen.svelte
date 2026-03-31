<script lang="ts" module>
	export interface LoadScreenState {
		enabled: boolean;
		entered: boolean;
	}

	export const loadScreenState: LoadScreenState = $state({
		enabled: true,
		entered: false
	});

	export function enable() {
		if (!loadScreenState.enabled) {
			loadScreenState.enabled = true;
		}
	}

	export function disable() {
		if (loadScreenState.enabled) {
			loadScreenState.enabled = false;
		}
	}
</script>

<script lang="ts">
	import type { Attachment } from "svelte/attachments";

	const animationTrigger: Attachment<HTMLDivElement> = () => {
		loadScreenState.entered = true;
	};
</script>

{#if loadScreenState.enabled}
	<div
		class="absolute top-0 left-0 z-50 flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-white"
		{@attach animationTrigger}
	>
		<div>
			<enhanced:img
				src="$lib/assets/sjvair-icon.webp"
				alt="SJVAir Icon"
				class="icon inline-block h-24 w-auto transition-all duration-500 ease-out"
				class:translate-x-0={loadScreenState.entered}
				class:-translate-x-full={!loadScreenState.entered}
				class:opacity-100={loadScreenState.entered}
				class:opacity-0={!loadScreenState.entered}
			/>
			<enhanced:img
				src="$lib/assets/sjvair-sjv.webp"
				alt="SJV"
				class="sjv inline-block h-24 w-auto transition-all duration-500 ease-out"
				class:translate-y-0={loadScreenState.entered}
				class:-translate-y-full={!loadScreenState.entered}
				class:opacity-100={loadScreenState.entered}
				class:opacity-0={!loadScreenState.entered}
			/>
			<enhanced:img
				src="$lib/assets/sjvair-air.webp"
				alt="Air"
				class="air inline-block h-24 w-auto transition-all duration-500 ease-out"
				class:translate-y-0={loadScreenState.entered}
				class:translate-y-full={!loadScreenState.entered}
				class:opacity-100={loadScreenState.entered}
				class:opacity-0={!loadScreenState.entered}
			/>
		</div>
	</div>
{/if}

<style>
</style>
