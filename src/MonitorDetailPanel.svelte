<script lang="ts">
	import { navigate, route } from "./router";

	const { id } = route.getParams("/monitor/:id");
</script>

<div class="flex flex-col w-full h-full bg-white overflow-y-auto">
	<div class="flex items-center gap-3 p-4 border-b border-gray-200">
		<button
			class="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 cursor-pointer"
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
