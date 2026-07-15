<script lang="ts">
	import { hmsFireMapIntegration } from "../hms-fire-map-integration.svelte";

	const levels = ["<10", "10-49", "50-149", "150-349", "≥350"];
</script>

{#if hmsFireMapIntegration.enabled && hmsFireMapIntegration.features.length > 0}
	<div class="flex flex-col bg-white rounded shadow w-fit p-1">
		<p class="text-center whitespace-nowrap font-semibold">Fire Points</p>
		<div class="flex flex-col">
			{#each hmsFireMapIntegration.icons.iter as [, icon], idx (idx)}
				<div class="flex gap-1 items-center">
					<div class="size-9 flex justify-center items-center">
						<img src={icon.image.src} alt={icon.image.alt} />
					</div>
					<span>{levels[idx]} MW</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
