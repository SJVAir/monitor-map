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
	import type { Snippet } from "svelte";
	import type { Attachment } from "svelte/attachments";

	interface Props {
		/** Rendered under the logo while the load screen is up, e.g. a load failure and a retry */
		error?: Snippet;
	}

	let { error }: Props = $props();

	const animationTrigger: Attachment<HTMLDivElement> = () => {
		loadScreenState.entered = true;
	};
</script>

{#if loadScreenState.enabled}
	<div
		class="absolute top-0 left-0 z-50 flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden bg-white"
		{@attach animationTrigger}
	>
		<div class="flex justify-around gap-4">
			<enhanced:img
				src="./assets/logos/sjvair-parts/sjvair-icon.webp"
				alt="SJVAir Icon"
				class="icon inline-block h-24! w-auto! object-contain transition-all duration-500 ease-out"
				class:translate-x-0={loadScreenState.entered}
				class:-translate-x-full={!loadScreenState.entered}
				class:opacity-100={loadScreenState.entered}
				class:opacity-0={!loadScreenState.entered}
			/>
			<enhanced:img
				src="./assets/logos/sjvair-parts/sjvair-sjv.webp"
				alt="SJV"
				class="sjv inline-block h-24! w-auto! object-contain transition-all duration-500 ease-out"
				class:translate-y-0={loadScreenState.entered}
				class:-translate-y-full={!loadScreenState.entered}
				class:opacity-100={loadScreenState.entered}
				class:opacity-0={!loadScreenState.entered}
			/>
			<enhanced:img
				src="./assets/logos/sjvair-parts/sjvair-air.webp"
				alt="Air"
				class="air inline-block h-24! w-auto! object-contain transition-all duration-500 ease-out"
				class:translate-y-0={loadScreenState.entered}
				class:translate-y-full={!loadScreenState.entered}
				class:opacity-100={loadScreenState.entered}
				class:opacity-0={!loadScreenState.entered}
			/>
		</div>
		{@render error?.()}
	</div>
{/if}
