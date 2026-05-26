<script lang="ts">
	import CreditCard from "@lucide/svelte/icons/credit-card";
	import Zap from "@lucide/svelte/icons/zap";
	import type { EvStationMapFeature } from "../types";

	interface Props {
		feature: EvStationMapFeature;
	}

	const { feature }: Props = $props();

	const computed = $derived.by(() => {
		const p = feature.properties;

		const connectors: string[] = JSON.parse(p.ev_connector_types || "[]");

		const cards: string[] = p.cards_accepted
			? p.cards_accepted.split(",").map((c) => c.trim())
			: [];

		const hours: string[] = (() => {
			if (!p.access_days_time) return [];
			const delimiter = p.access_days_time.includes("|") ? "|" : ";";
			return p.access_days_time.split(delimiter).map((line) => {
				const trimmed = line.trim();
				return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
			});
		})();

		const pricingLines: string[] = (() => {
			if (!p.ev_pricing) return [];
			return p.ev_pricing.split(";").flatMap((segment) =>
				segment
					.split("and")
					.map((part) => part.trim())
					.filter(Boolean)
			);
		})();

		const mapsUrl: string = (() => {
			if (!p.street_address || !p.city || !p.state || !p.zip) return "";
			return `https://maps.google.com/?q=${p.street_address}+${p.city},+${p.state}+${p.zip}`;
		})();

		return { p, connectors, cards, hours, pricingLines, mapsUrl };
	});
</script>

<div class="flex max-w-xs flex-col gap-2 p-1">
	<p class="text-center text-lg font-bold">{computed.p.station_name}</p>

	{#if computed.p.facility_type || computed.p.ev_network}
		<div class="flex flex-wrap justify-center gap-2">
			{#if computed.p.facility_type}
				<span class="rounded bg-blue-500 px-2 py-0.5 text-xs text-white"
					>{computed.p.facility_type}</span
				>
			{/if}
			{#if computed.p.ev_network}
				<span class="rounded bg-blue-500 px-2 py-0.5 text-xs text-white"
					>{computed.p.ev_network}</span
				>
			{/if}
		</div>
	{/if}

	<div class="flex gap-4">
		<div class="flex flex-col gap-1">
			{#if computed.p.station_phone}
				<a href="tel:+1{computed.p.station_phone}" class="text-sm underline"
					>{computed.p.station_phone}</a
				>
			{/if}
			{#if computed.mapsUrl}
				<a href={computed.mapsUrl} target="_blank" class="text-sm leading-tight underline">
					{computed.p.street_address}<br />{computed.p.city}, {computed.p.state}
					{computed.p.zip}
				</a>
			{/if}
		</div>
		{#if computed.hours.length}
			<div class="flex flex-col text-sm">
				{#each computed.hours as line, i (i)}
					<p>{line}</p>
				{/each}
			</div>
		{/if}
	</div>

	{#if computed.p.access_detail_code}
		<span class="w-fit rounded bg-red-500 px-2 py-0.5 text-xs text-white">
			{computed.p.access_detail_code}
		</span>
	{/if}

	{#if computed.cards.length}
		<div class="flex flex-wrap gap-1">
			{#each computed.cards as card, i (i)}
				<span class="flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs">
					<CreditCard class="size-3.5" />
					{card}
				</span>
			{/each}
		</div>
	{/if}

	{#if computed.connectors.length}
		<div class="flex flex-wrap gap-1">
			{#each computed.connectors as connector, i (i)}
				<span
					class="flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white"
				>
					<Zap class="size-3.5" />
					{connector}
				</span>
			{/each}
		</div>
	{/if}

	{#if computed.pricingLines.length}
		<div class="text-sm">
			{#each computed.pricingLines as line, i (i)}
				<p>{line}</p>
			{/each}
		</div>
	{/if}
</div>
