<script lang="ts">
	interface Props {
		message: string;
		onretry: () => void;
	}

	let { message, onretry }: Props = $props();
</script>

<div class="flex flex-col items-center gap-3 px-4 text-center" role="alert">
	<p class="text-gray-700">{message}</p>
	<button
		type="button"
		class="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
		onclick={onretry}
	>
		Try again
	</button>
</div>
