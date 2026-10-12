<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import LoadScreen from "./LoadScreen.svelte";
	import LoadError from "./LoadError.svelte";
	import { loadMonitorDetailPanel, loadMonitorMapLayout } from "./lazy-chunks";
	import { useMonitorMapRouter } from "./router-context";

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const { route, basePath } = useMonitorMapRouter();

	let Layout: Component<Props> | null = $state.raw(null);
	let failed = $state(false);

	function load() {
		failed = false;
		loadMonitorMapLayout().then(
			(module) => (Layout = module.default),
			(error) => {
				console.error(error);
				failed = true;
			}
		);
	}

	load();
	// On a link straight to a monitor, fetch its panel alongside the layout; the panel's own
	// wrapper only mounts (and would only ask for it) once the layout has arrived. A failure is
	// reported by that wrapper when it asks again.
	if (route.pathname.startsWith(`${basePath}/monitor/`)) {
		loadMonitorDetailPanel().catch(() => {});
	}
</script>

<!-- The layout renders the same LoadScreen from the same shared state, so it carries on
     from this one without restarting. -->
{#if Layout}
	<Layout>{@render children()}</Layout>
{:else}
	<div class="relative h-full w-full">
		<LoadScreen>
			{#snippet error()}
				{#if failed}
					<LoadError message="Couldn't load the map." onretry={load} />
				{/if}
			{/snippet}
		</LoadScreen>
	</div>
{/if}
