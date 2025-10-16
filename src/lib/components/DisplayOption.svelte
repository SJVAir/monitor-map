<script lang="ts">
	let { children } = $props();
</script>

<div class="flex flex-col items-start justify-center rounded">
  {@render children?.()}
</div>
