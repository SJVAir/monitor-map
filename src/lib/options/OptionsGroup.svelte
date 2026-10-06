<script lang="ts">
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<!-- Joined button cluster on the toolbar; a plain stack of sections in the panel. -->
<div
	class="flex flex-col gap-2 md:flex-row md:gap-0 md:divide-x md:divide-gray-200 md:rounded-md md:bg-white md:shadow"
>
	{@render children()}
</div>
