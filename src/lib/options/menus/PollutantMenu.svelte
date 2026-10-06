<script lang="ts">
	import { BanIcon, HazeIcon, SunDimIcon } from "@lucide/svelte";
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

	interface PollutantOption {
		value: PollutantSelection;
		label: string;
		unit?: string;
		help?: string;
		icon: typeof HazeIcon;
		color: string;
	}

	const options: Array<PollutantOption> = [
		{
			value: "pm25",
			label: "PM2.5",
			unit: "µg/m³",
			help: "Fine particles from smoke, dust, and vehicle exhaust.",
			icon: HazeIcon,
			color: "#bc8f8f"
		},
		{
			value: "o3",
			label: "Ozone",
			unit: "ppb",
			help: "Ground-level gas that forms in sunlight on hot days.",
			icon: SunDimIcon,
			color: "#daa520"
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

<OptionsMenu id="pollutant" label={selected.label}>
	{#snippet icon()}
		<selected.icon size={20} color={selected.color} />
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
				<option.icon size={18} color={option.color} />
			{/snippet}
		</RadioRow>
	{/each}
</OptionsMenu>
