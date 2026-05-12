<script lang="ts">
	import { navigate, route } from "./router";

	let id = $derived(route.params.id ?? "");
</script>

<div class="flex h-full w-full flex-col overflow-y-auto bg-white">
	<div class="flex items-center gap-3 border-b border-gray-200 p-4">
		<button
			class="cursor-pointer rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
			onclick={() => navigate("/")}
		>
			✕ Close
		</button>
		<h2 class="text-lg font-semibold">Monitor {id}</h2>
	</div>
	<div class="flex-1 p-4">
		<!-- Monitor details will be implemented here -->
	</div>
</div>
