<script lang="ts">
	import DisplayOption from "$lib/components/DisplayOption.svelte";
	//import { MonitorsController } from "$lib/monitors/monitors.svelte";
	import { MonitorsDisplayOptions } from "./monitors-display-options.svelte";
	import { MonitorsMapIntegration } from "./monitors-map-integration.svelte";

	//const mc = new MonitorsController();
	const mi = new MonitorsMapIntegration();
	const display = new MonitorsDisplayOptions();
	//$effect(() => {
	//	// NOTE: Has to reference option.value
	//	console.log(display.options.airnow.value);
	//	console.log(display.options.aqview.value);
	//	console.log(display.options.bam1022.value);
	//	console.log(display.options.inactive.value);
	//	console.log(display.options.inside.value);
	//	console.log(display.options.purpleair.value);
	//	console.log(display.options.sjvair.value);
	//	//for (const option of Object.values(display.options)) {
	//	//  console.log(`Option: ${option.label}, Value: ${option.value}`);
	//	//}
	//});
</script>

{#if display.options}
	<DisplayOption>
		<p class="text-lg font-bold underline">Air Monitors</p>
		<label for="clusters" class="my-1 cursor-pointer font-bold whitespace-nowrap select-none">
			<input type="checkbox" id="clusters" name="clusters" bind:checked={display.enableClusters} />
			Enable Clustering
			{#if display.enableClusters}
				<div class="ml-4 flex flex-col gap-0 text-sm font-normal">
					Cluster Type:
					<div>
						<label>
							<input
								type="radio"
								name="clusterType"
								value="shapes"
								bind:group={display.clusterMode}
							/> Shapes
						</label>
						{#if display.clusterMode === "shapes"}
							<label class="text-sm font-bold underline">
								<br />
								Shape Choice:
								<br />
								<select
									id="myDropdown"
									name="selectedOption"
									bind:value={display.shapeStyle}
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
						<input
							type="radio"
							name="clusterType"
							value="circles"
							bind:group={display.clusterMode}
						/> Circles
					</label>
					<label>
						<input
							type="radio"
							name="clusterType"
							value="monitorType"
							bind:group={display.clusterMode}
						/> Monitor Type Icons
					</label>
				</div>
			{/if}
		</label>

		{#each Object.values(display.options) as option}
			<label for={option.label} class="cursor-pointer whitespace-nowrap select-none">
				<input type="checkbox" id={option.label} name={option.label} bind:checked={option.value} />
				{option.label}
				{option.value}
			</label>
		{/each}
	</DisplayOption>
{/if}
