<script lang="ts">
	let { children } = $props();
</script>

<div
	class="absolute top-0 left-0 flex w-fit items-start justify-center gap-2 rounded bg-white p-2 shadow"
>
	{@render children?.()}
</div>
