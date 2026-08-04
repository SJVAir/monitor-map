<script lang="ts">
	import { hmsFireMapIntegration } from "../hms-fire-map-integration.svelte";

	const levels = ["<10", "10-49", "50-149", "150-349", "≥350"];
</script>

{#if hmsFireMapIntegration.enabled && hmsFireMapIntegration.features.length > 0}
	<div class="flex w-fit flex-col rounded bg-white p-1 shadow">
		<p class="text-center font-semibold whitespace-nowrap">Fire Points</p>
		<div class="flex flex-col">
			{#each hmsFireMapIntegration.icons.iter as [, icon], idx (idx)}
				<div class="flex items-center gap-1">
					<div class="flex size-9 items-center justify-center">
						<img src={icon.image.src} alt={icon.image.alt} />
					</div>
					<span>{levels[idx]} MW</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
