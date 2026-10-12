<script lang="ts">
	import type { Component } from "svelte";
	import LoadError from "./LoadError.svelte";
	import { loadMonitorDetailPanel } from "./lazy-chunks";

	let Panel: Component | null = $state.raw(null);
	let failed = $state(false);

	function load() {
		failed = false;
		loadMonitorDetailPanel().then(
			(module) => (Panel = module.default),
			(error) => {
				console.error(error);
				failed = true;
			}
		);
	}

	load();
</script>

{#if Panel}
	<Panel />
{:else}
	<div class="flex h-full w-full items-center justify-center bg-white">
		{#if failed}
			<LoadError message="Couldn't load this monitor." onretry={load} />
		{:else}
			<p class="text-sm text-gray-500">Loading…</p>
		{/if}
	</div>
{/if}
