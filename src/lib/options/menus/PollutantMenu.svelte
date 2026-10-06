<script lang="ts">
	import { BanIcon } from "@lucide/svelte";
	import OptionsMenu from "../OptionsMenu.svelte";
	import RadioRow from "../rows/RadioRow.svelte";
	import { useOptionsMenus } from "../options-state.svelte.js";
	import { isWideLayout } from "../layout";
	import {
		applyPollutantSelection,
		currentSelection,
		type PollutantSelection
	} from "../pollutant-param";
	import { monitorsManager } from "$lib/monitors/monitors.svelte";
	import { monitorsMapIntegration } from "$lib/monitors/monitors-map-integration.svelte";
	import pm25Icon from "$lib/assets/icons/pm25/pm25-02-particle-field.svg";
	import ozoneIcon from "$lib/assets/icons/ozone/ozone-08-sunrise-haze.svg";

	interface PollutantOption {
		value: PollutantSelection;
		label: string;
		unit?: string;
		help?: string;
		/** Lucide component, or an image URL for multi-color SVG icons */
		icon: typeof BanIcon | string;
		/** Tint for Lucide icons; image icons carry their own colors */
		color?: string;
	}

	const options: Array<PollutantOption> = [
		{
			value: "pm25",
			label: "PM2.5",
			unit: "µg/m³",
			help: "Fine particles from smoke, dust, and vehicle exhaust.",
			icon: pm25Icon
		},
		{
			value: "o3",
			label: "Ozone",
			unit: "ppb",
			help: "Ground-level gas that forms in sunlight on hot days.",
			icon: ozoneIcon
		},
		{ value: "none", label: "None", icon: BanIcon, color: "#778899" }
	];

	const menus = useOptionsMenus();
	const selection = $derived(
		currentSelection(monitorsManager.pollutant, monitorsMapIntegration.enabled)
	);
	const selected = $derived(options.find((o) => o.value === selection) ?? options[0]);

	function select(value: PollutantSelection) {
		applyPollutantSelection(value, {
			manager: monitorsManager,
			integration: monitorsMapIntegration
		});
		// Toolbar dropdown closes on pick; the panel section stays open.
		if (isWideLayout()) menus.close("pollutant");
	}
</script>

{#snippet pollutantIcon(option: PollutantOption, size: number)}
	{#if typeof option.icon === "string"}
		<img src={option.icon} alt="" width={size} height={size} class="shrink-0" />
	{:else}
		<option.icon {size} color={option.color} />
	{/if}
{/snippet}

<OptionsMenu id="pollutant" label={selected.label}>
	{#snippet icon()}
		{@render pollutantIcon(selected, 20)}
	{/snippet}
	{#each options as option, i (option.value)}
		{#if i > 0}<hr class="my-1 border-gray-200" />{/if}
		<RadioRow
			name="monitor-map-pollutant"
			label={option.label}
			unit={option.unit}
			help={option.help}
			checked={selection === option.value}
			onselect={() => select(option.value)}
		>
			{#snippet icon()}
				{@render pollutantIcon(option, 18)}
			{/snippet}
		</RadioRow>
	{/each}
</OptionsMenu>
