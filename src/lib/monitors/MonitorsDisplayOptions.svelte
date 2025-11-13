<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	import { MonitorsController } from "$lib/monitors/monitors.svelte";
	import { MonitorDisplayOptions } from "./monitors-display-options.svelte";
	import { MonitorsMapIntegration } from "./monitors-map-integration.svelte";

	//const mc = new MonitorsController();
	const mi = new MonitorsMapIntegration();
	const display = new MonitorDisplayOptions();
</script>

{#if display.options}
	<DisplayOption>
		<p class="text-lg font-bold underline">Air Monitors</p>
		<label for="clusters" class="my-1 cursor-pointer font-bold whitespace-nowrap select-none">
			<input type="checkbox" id="clusters" name="clusters" bind:checked={mi.enableClusters} />
			Enable Clustering
			{#if mi.enableClusters}
				<div class="ml-4 flex flex-col gap-0 text-sm font-normal">
					Cluster Type:
					<div>
						<label>
							<input type="radio" name="clusterType" value="shapes" bind:group={mi.clusterMode} /> Shapes
						</label>
						{#if mi.clusterMode === "shapes"}
							<label class="text-sm font-bold underline">
								<br />
								Shape Choice:
								<br />
								<select
									id="myDropdown"
									name="selectedOption"
									bind:value={mi.shapeStyle}
									class="w-50 rounded border p-1"
								>
									{#each Object.keys(MonitorsMapIntegration.mapCtrl.map!.style.imageManager.images) as label}
										<option value={label}>{label}</option>
									{/each}
								</select>
							</label>
							<br />
							<br />
						{/if}
					</div>
					<label>
						<input type="radio" name="clusterType" value="circles" bind:group={mi.clusterMode} /> Circles
					</label>
					<label>
						<input
							type="radio"
							name="clusterType"
							value="monitorType"
							bind:group={mi.clusterMode}
						/> Monitor Type Icons
					</label>
				</div>
			{/if}
		</label>

		{#each Object.values(display.options) as option}
			<label for={option.label} class="cursor-pointer whitespace-nowrap select-none">
				<input type="checkbox" id={option.label} name={option.label} bind:checked={option.value} />
				{option.label}
			</label>
		{/each}
	</DisplayOption>
{/if}
